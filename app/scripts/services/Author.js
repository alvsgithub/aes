'use strict';

/**
* A factory which creates article author model.
*
* @class Author
*/
angular.module('authoringEnvironmentApp').factory('Author', [
    '$http',
    '$q',
    '$timeout',
    'dateFactory',
    'pageTracker',
    function (
        $http,
        $q,
        $timeout,
        dateFactory,
        pageTracker) {
        var SEARCH_DELAY_MS = 250,  // after the last search term change
            lastContext = null,  // most recent live search context
            lastTermChange = 0,  // time of the most recent search term change
            Author = function () {};  // author constructor function;

        /**
        * Converts author data object to an Author resource object with
        * more structured data and methods for communicating with API.
        *
        * @method createFromApiData
        * @param data {Object} object containing author data as returned by API
        * @return {Object} author resource object
        */
        Author.createFromApiData = function (data) {
            var author = new Author();

            author.id = data.author.id;
            author.firstName = data.author.firstName;
            author.lastName = data.author.lastName;
            author.text = data.author.firstName + ' ' + data.author.lastName;

            if (data.type) {
                author.articleRole = {
                    id: data.type.id,
                    name: data.type.type
                };
            } else {
                author.articleRole = null;
            }

            if (data.author.image) {
                author.avatarUrl = decodeURIComponent(data.author.image);
            } else {
                author.avatarUrl = '/bundles/newscoopeditor/images/' +
                    'authors-default-avatar.png';
            }

            author.sortOrder = data.order;

            return author;
        };

        /**
        * Retrieves a list of all article authors for the given article.
        *
        * @method getAllByArticle
        * @param number {Number} article ID
        * @param language {String} article language code, e.g. 'de'
        * @return {Object} array of article authors
        */
        Author.getAllByArticle = function (number, language) {
            var authors = [],
                deferredGet = $q.defer(),
                url;

            authors.$promise = deferredGet.promise;

            url = Routing.generate(
                'newscoop_gimme_authors_getarticleauthors',
                {
                    number: number,
                    language: language,
                    items_per_page: 99999
                },
                true
            );

            $http.get(url)
            .success(function (response) {
                response.items.forEach(function (item) {
                    item = Author.createFromApiData(item);
                    authors.push(item);
                });
                deferredGet.resolve();
            }).error(function (responseBody) {
                deferredGet.reject(responseBody);
            });

            return authors;
        };

        /**
        * Retrieves a list of all defined author roles from the server.
        *
        * @method getRoleList
        * @return {Object} array of article roles
        */
        Author.getRoleList = function () {
            var deferredGet = $q.defer(),
                roles = [],
                url;

            roles.$promise = deferredGet.promise;

            url = Routing.generate(
                'newscoop_gimme_authors_getauthorstypes',
                {items_per_page: 99999},
                true
            );

            $http.get(url)
            .success(function (response) {
                response.items.forEach(function (item) {
                    // "name" is more informative attribute name
                    item.name = item.type;
                    delete item.type;
                    roles.push(item);
                });
                deferredGet.resolve();
            }).error(function (responseBody) {
                deferredGet.reject(responseBody);
            });

            return roles;
        };

        /**
        * Retrieves a list of article authors in a way that is suitable for use
        * as a query function for the select2 widget.
        *
        * @method liveSearchQuery
        * @param options {Object} options object provided by select2 on every
        *   invocation.
        * @param [isCallback=false] {Boolean} if the method is "manually"
        *   invoked (i.e. not by the select2 machinery), this flag should be
        *   set so that the method is aware of this fact
        */
        Author.liveSearchQuery = function (options, isCallback) {
            var isPaginationCall = (options.page > 1),
                now = dateFactory.makeInstance(),
                url;

            if (!isCallback) {
                // regular select2's onType event, input changed

                if (!isPaginationCall) {
                    lastTermChange = now;

                    $timeout(function () {
                        // NOTE: tests spy on self.authorResource object, thus
                        // we don't call self.liveSearchQuery() but instead
                        // invoke the method through self.authorResource object
                        Author.liveSearchQuery(options, true);
                    }, SEARCH_DELAY_MS);
                    return;
                } else {
                    if (angular.equals(options.context, lastContext)) {
                        // select2 bug, same pagination page called twice:
                        // https://github.com/ivaynberg/select2/issues/1610
                        return;  // just skip it
                    }
                    lastContext = options.context;
                }
            }

            if (!isPaginationCall && now - lastTermChange < SEARCH_DELAY_MS) {
                return;  // search term changed, skip this obsolete call
            }

            url = Routing.generate(
                'newscoop_gimme_authors_searchauthors',
                {
                    items_per_page: 10,
                    page: options.page,
                    query: options.term
                },
                true
            );

            $http.get(url)
            .success(function (response) {
                var author,
                    authorList = [];

                response.items.forEach(function (item) {
                    author = Author.createFromApiData({author: item});
                    authorList.push(author);
                });

                options.callback({
                    results: authorList,
                    more: !pageTracker.isLastPage(response.pagination),
                    context: response.pagination
                });
            });
        };

        /**
        * Sets a new order of article authors.
        *
        * @method setOrderOnArticle
        * @param number {Number} article ID
        * @param language {String} article language code (e.g. 'de')
        * @param authors {Object} array with author object(s) in desired order
        */
        Author.setOrderOnArticle = function (number, language, authors) {
            var order = [];

            authors.forEach(function (item) {
                order.push(item.id + '-' + item.articleRole.id);
            });
            order = order.join();

            $http.post(
                Routing.generate(
                    'newscoop_gimme_authors_setarticleauthorsorder',
                    {number: number, language: language},
                    true
                ),
                {order: order}
            );
        };

        /**
        * Sets author as article author on the given article
        * with the given role.
        *
        * @method addToArticle
        * @param number {Number} article ID
        * @param language {String} article language code (e.g. 'de')
        * @param roleId {Number} ID of the author's role on the article
        * @return {Object} promise object that is resolved on successful server
        *   response and rejected on server error response
        */
        Author.prototype.addToArticle = function (number, language, roleId) {
            var author = this,
                deferred = $q.defer(),
                linkHeader,
                url;

            linkHeader = [
                '<',
                Routing.generate(
                    'newscoop_gimme_authors_getauthorbyid',
                    {id: author.id},
                    false
                ),
                '; rel="author">,',
                '<',
                Routing.generate(
                    'newscoop_gimme_authors_getauthortype',
                    {id: roleId},
                    false
                ),
                '; rel="author-type">'
            ].join('');

            url = Routing.generate(
                'newscoop_gimme_articles_linkarticle',
                {number: number, language: language},
                true
            );

            $http({
                url: url,
                method: 'LINK',
                headers: {link: linkHeader}
            })
            .success(function () {
                author.articleRole = author.articleRole || {};
                author.articleRole.id = roleId;
                deferred.resolve();
            })
            .error(function (responseBody) {
                deferred.reject(responseBody);
            });

            return deferred.promise;
        };


        /**
        * Removes author as article author from the given article for the
        * specified role.
        *
        * @method removeFromArticle
        * @param number {Number} article ID
        * @param language {String} article language code (e.g. 'de')
        * @param roleId {Number} ID of the author's role on the article
        * @return {Object} promise object that is resolved on successful server
        *   response and rejected on server error response
        */
        Author.prototype.removeFromArticle = function (
            number, language, roleId
        ) {
            var author = this,
                deferred = $q.defer(),
                linkHeader,
                url;

            linkHeader = [
                '<',
                Routing.generate(
                    'newscoop_gimme_authors_getauthorbyid',
                    {id: author.id},
                    false
                ),
                '; rel="author">,',
                '<',
                Routing.generate(
                    'newscoop_gimme_authors_getauthortype',
                    {id: roleId},
                    false
                ),
                '; rel="author-type">'
            ].join('');

            url = Routing.generate(
                'newscoop_gimme_articles_unlinkarticle',
                {number: number, language:language},
                true
            );

            $http({
                url: url,
                method: 'UNLINK',
                headers: {link: linkHeader}
            })
            .success(function () {
                deferred.resolve();
            })
            .error(function (responseBody) {
                deferred.reject(responseBody);
            });

            return deferred.promise;
        };

        /**
        * Updates author's role on a specific article on the server.
        *
        * @method updateRole
        * @param params {Object} object containing API parameters
        *   @param params.number {Number} article ID
        *   @param params.language {String} article language code (e.g. 'de')
        *   @param params.oldRoleId {Number} author's previous role ID
        *   @param params.newRoleId {Number} author's new role ID
        * @return {Object} $http promise
        */
        Author.prototype.updateRole = function (params) {
            var headersParam,
                linkHeader,
                promise,
                url;

            linkHeader = [
                '<',
                Routing.generate(
                    'newscoop_gimme_authors_getauthortype',
                    {id: params.oldRoleId},
                    false
                ),
                '; rel="old-author-type">,',
                '<',
                Routing.generate(
                    'newscoop_gimme_authors_getauthortype',
                    {id: params.newRoleId},
                    false
                ),
                '; rel="new-author-type">'
            ].join('');

            url = Routing.generate(
                'newscoop_gimme_authors_updatearticleauthor',
                {
                    number: params.number,
                    language: params.language,
                    authorId: this.id
                },
                true
            );

            headersParam = {
                headers: {
                    link: linkHeader
                }
            };

            promise = $http.post(url, {}, headersParam);
            return promise;
        };

        return Author;
    }
]);
