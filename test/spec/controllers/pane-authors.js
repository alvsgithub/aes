'use strict';

/**
* Module with tests for the authors pane controller.
*
* @module PaneAuthorsCtrl controller tests
*/

describe('Controller: PaneAuthorsCtrl', function () {

    beforeEach(module('authoringEnvironmentApp'));

    var article,
        articleDeferred,
        Author,
        authors,
        ctrl,
        roles,
        scope,
        $q;

    roles = [
        {id: 1, name: 'Writer'},
        {id: 4, name: 'Photographer'},
        {id: 6, name: 'Comments moderator'},
        {id: 13, name: 'Lector'},
    ];

    authors = [{
            id: 22,
            firstName: 'John',
            lastName: 'Doe',
            articleRole: {
                id: 1,
                name: 'Writer'
            },
            avatarUrl: 'http://foo.bar/image/thumb_22.png',
            sortOrder: 1
        }, {
            id: 162,
            firstName: 'Jack',
            lastName: 'Black',
            articleRole: {
                id: 4,
                name: 'Photographer'
            },
            avatarUrl: 'http://foo.bar/image/thumb_162.png',
            sortOrder: 5
        }
    ];

    beforeEach(inject(
        function ($controller, $rootScope, _$q_, _article_, _Author_) {
            $q = _$q_;
            article = _article_;
            Author = _Author_;

            articleDeferred = $q.defer();
            article.promise = articleDeferred.promise;

            spyOn(Author, 'getRoleList').andCallFake(function () {
                return roles;
            });

            scope = $rootScope.$new();
            ctrl = $controller('PaneAuthorsCtrl', {
                $scope: scope,
                article: article,
                Author: Author
            });
        }
    ));

    it('initializes a list of author roles in scope', function () {
        expect(Author.getRoleList).toHaveBeenCalled();
        expect(scope.authorRoles).toEqual(roles);
    });

    it('initializes a list of article authors in scope', function () {
        var authorsDeferred = $q.defer();

        spyOn(Author, 'getAll').andCallFake(function () {
            var result = angular.copy(authors);
            result.$promise = authorsDeferred.promise;
            return result;
        });

        // authors list is empty until the server responds
        expect(_.difference(scope.authors, [])).toEqual([]);

        articleDeferred.resolve({number: 64, language: 'de'});
        authorsDeferred.resolve(authors);
        scope.$apply();

        expect(Author.getAll)
            .toHaveBeenCalledWith({number: 64, language: 'de'});
        expect(scope.authors).toEqual(authors);
    });

    // TODO: tests that authors watches are initialized

});
