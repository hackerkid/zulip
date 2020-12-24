"use strict";

exports.initialize = function () {
    helpers.set_tab("billing");

    const stripe_key = $("#payment-method").data("key");
    const card_change_handler = StripeCheckout.configure({
        key: stripe_key,
        image: "/static/images/logo/zulip-icon-128x128.png",
        locale: "auto",
        token(stripe_token) {
            helpers.create_ajax_request("/json/billing/sources/change", "cardchange", stripe_token);
        },
    });

    $("#update-card-button").on("click", (e) => {
        const email = $("#payment-method").data("email");
        card_change_handler.open({
            name: "Zulip",
            zipCode: true,
            billingAddress: true,
            panelLabel: "Update card",
            email,
            label: "Update card",
            allowRememberMe: false,
        });
        e.preventDefault();
    });

    function create_update_license_request() {
        helpers.create_ajax_request(
            "/json/billing/plan",
            "licensechange",
            undefined,
            ["licenses"],
            undefined,
            "PATCH",
        );
    }

    $("#update-licenses-button").on("click", (e) => {
        const current_licenses = $("#licensechange-input-section").data("licenses");
        const new_licenses = $("#new_license_count_input").val();
        if (new_licenses > current_licenses) {
            $("#new_license_count_holder").text(new_licenses);
            $("#current_license_count_holder").text(current_licenses);
            $("#confirm-licenses-modal").modal("show");
        } else {
            create_update_license_request();
        }
        e.preventDefault();
    });

    $("#confirm-license-update-button").on("click", () => {
        create_update_license_request();
    });

    $("#change-plan-status").on("click", (e) => {
        helpers.create_ajax_request(
            "/json/billing/plan",
            "planchange",
            undefined,
            ["status"],
            undefined,
            "PATCH",
        );
        e.preventDefault();
    });
};

window.billing = exports;

$(() => {
    exports.initialize();
});
