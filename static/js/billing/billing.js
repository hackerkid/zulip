"use strict";

exports.initialize = function () {
    helpers.set_tab("billing");

    $("#update-card-button").on("click", (e) => {
        const success_callback = (response) => {
            const stripe = Stripe(response.stripe_publishable_key);
            stripe.redirectToCheckout({
                sessionId: response.session_id
              }).then(function (result) {
                // If `redirectToCheckout` fails due to a browser or network
                // error, display the localized error message to your customer
                // using `result.error.message`.
            });
        }
        helpers.create_ajax_request("/json/billing/session/start_card_update_session", "cardupdate", [], success_callback);
        e.preventDefault();
    });

    $("#change-plan-status").on("click", (e) => {
        helpers.create_ajax_request("/json/billing/plan/change", "planchange", undefined, [
            "status",
        ]);
        e.preventDefault();
    });
};

window.billing = exports;

$(() => {
    exports.initialize();
});
