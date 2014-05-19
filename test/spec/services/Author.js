'use strict';

/**
* Module with tests for the Author resource factory.
*
* @module Author resource factory tests
*/

describe('Factory: Author', function () {

    var Author,
        authorsResponse,
        rolesResponse,
        $httpBackend;

    rolesResponse = {
        items: [
            {id: 1, type: 'Writer'},
            {id: 4, type: 'Photographer'},
            {id: 13, type: 'Lector'},
        ]
    };

    authorsResponse = {
        items: [{
            author: {
                id: 22,
                firstName: 'John',
                lastName: 'Doe',
                image: 'foo.bar/image%2Fthumb_22.png'
            },
            type: {
                id: 1,
                type: 'Writer'
            },
            order: 1
        }]
    };

    beforeEach(module('authoringEnvironmentApp'));

    beforeEach(inject(function (_Author_, _$httpBackend_) {
        Author = _Author_;
        $httpBackend = _$httpBackend_;
    }));

    describe('getAll() method', function () {
        beforeEach(function () {
            $httpBackend.expectGET(
                rootURI + '/articles/64/de/authors?items_per_page=99999'
            ).respond(JSON.stringify(authorsResponse));
        });

        afterEach(function () {
            $httpBackend.verifyNoOutstandingExpectation();
        });

        it('sends a correct request to API', function () {
            Author.getAll({number: 64, language: 'de'});
            $httpBackend.flush(1);
        });

        it('correctly transforms server response', function () {
            var authors,
                expectedItemData;

            authors = Author.getAll({number: 64, language: 'de'})

            // array is empty until the server responds
            expect(_.difference(authors, [])).toEqual([]);

            $httpBackend.flush(1);

            authors.forEach(function (item) {
                expect(item instanceof Author).toEqual(true);
            });

            expectedItemData = [{
                id: 22,
                firstName: 'John',
                lastName: 'Doe',
                articleRole: {
                    id: 1,
                    name: 'Writer'
                },
                avatarUrl: 'http://foo.bar/image/thumb_22.png',
                sortOrder: 1
            }];

            expectedItemData.forEach(function (data) {
                expect(_.findIndex(authors, data)).toBeGreaterThan(-1);
            });
        });
    });

    describe('getRoleList() method', function () {
        beforeEach(function () {
            $httpBackend.expectGET(
                rootURI + '/authors/types?items_per_page=99999'
            ).respond(JSON.stringify(rolesResponse));
        });

        afterEach(function () {
            $httpBackend.verifyNoOutstandingExpectation();
        });

        it('sends a correct request to API', function () {
            Author.getRoleList();
            $httpBackend.flush(1);
        });

        it('correctly transforms server response', function () {
            var expectedItemData,
                roles = Author.getRoleList();

            // array is empty until the server responds
            expect(_.difference(roles, [])).toEqual([]);

            $httpBackend.flush(1);

            roles.forEach(function (item) {
                expect(item instanceof Author).toEqual(true);
            });

            expectedItemData = [
                {id: 1, name: 'Writer'},
                {id: 4, name: 'Photographer'},
                {id: 13, name: 'Lector'}
            ];
            expectedItemData.forEach(function (data) {
                expect(_.findIndex(roles, data)).toBeGreaterThan(-1);
            });
        });
    });

    describe('updateRole() method', function () {
        it('sends a correct request to API', function () {
            var author,
                expectedLinkHeader;

            author = new Author({
                id: 22,
                firstName: 'John',
                lastName: 'Doe',
                articleRole: {
                    id: 4,
                    name: 'Photographer'
                }
            });
            expectedLinkHeader =
                '</content-api/authors/types/1; rel="old-author-type">,' +
                '</content-api/authors/types/4; rel="new-author-type">';

            $httpBackend.expectPOST(
                rootURI + '/articles/64/de/authors/22',
                {},
                function (headers) {
                    return headers.link === expectedLinkHeader;
                }
            ).respond(201, 'Created');

            author.updateRole(
                {number: 64, language: 'de', oldRoleId: 1, newRoleId: 4}
            );
            $httpBackend.flush(1);

            $httpBackend.verifyNoOutstandingExpectation();
        });
    });

});
