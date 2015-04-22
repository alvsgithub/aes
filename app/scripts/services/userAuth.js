(function () {
    'use strict';

    /**
    * Constructor function for the login modal controller
    *
    * @class ModalLoginCtrl
    */
    function ModalLoginCtrl($modalInstance, $window) {
        var self = this;

        // On successful login, Newscoop login form redirects user to some
        // redirect URL and that URL contains the new authentication token.
        // Upon redirect, the iframe in modal body is reloaded and we catch
        // its onLoad event, giving us a chance to extract new token from URL.

        /**
        * Updates article's workflow status on the server.
        *
        * @method close
        */
        self.close = function () {
            console.log($window.sessionStorage.getItem('token'));
            if ($window.sessionStorage.getItem('token')) {
                $modalInstance.close();
            }
            // if token is not found (perhaps due to the failed login),
            // nothing happens and the modal stays open
        };
    }

    ModalLoginCtrl.$inject = ['$modalInstance', '$window'];


    /**
    * A service for managing user authentication.
    *
    * @class userAuth
    */
    angular.module('authoringEnvironmentApp').service('userAuth', [
        '$http',
        '$modal',
        '$q',
        '$window',
        'toaster',
        function ($http, $modal, $q, $window, toaster) {
            var self = this;

            /**
            * Returns the current oAuth token in sessionStorage.
            *
            * @method token
            * @return {String} the token itself or null if does not exist
            */
            self.token = function () {
                return $window.sessionStorage.getItem('token');
            };

            /**
            * Returns true if the current user is authenticated (=has a token),
            * otherwise false.
            *
            * @method isAuthenticated
            * @return {Boolean}
            */
            self.isAuthenticated = function () {
                return !!$window.sessionStorage.getItem('token');
            };

            /**
            * Opens a modal with Newscoop login form. On successful login it
            * stores the new authentication token into session storage and
            * resolves given promise with it.
            *
            * @method newTokenByLoginModal
            * @return {Object} promise object
            */
            self.newTokenByLoginModal = function () {
                var deferred = $q.defer(),
                    dialog;

                dialog = $modal.open({
                    templateUrl: 'views/modal-login.html',
                    controller: ModalLoginCtrl,
                    controllerAs: 'ctrl',
                    windowClass: 'modalLogin',
                    backdrop: 'static'
                });

                dialog.result.then(function () {
                    toaster.add({
                        type: 'sf-info',
                        message: 'Successfully refreshed authentication token.'
                    });
                    deferred.resolve();
                })
                .catch(function (reason) {
                    toaster.add({
                        type: 'sf-error',
                        message: 'Failed to refresh authentication token.'
                    });
                    deferred.reject(reason);
                });

                return deferred.promise;
            };

        }
    ]);

}());
