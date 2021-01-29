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

    exports.create_update_license_request = function () {
        helpers.create_ajax_request(
            "/json/billing/plan",
            "licensechange",
            undefined,
            ["licenses"],
            ["licenses_at_next_renewal"],
            undefined,
            "PATCH",
        );
    };

    $("#update-licenses-button").on("click", (e) => {
        if (helpers.is_valid_input($("#new_licenses_input")) === false) {
            return;
        }
        e.preventDefault();
        const current_licenses = $("#licensechange-input-section").data("licenses");
        const new_licenses = $("#new_licenses_input").val();
        if (new_licenses > current_licenses) {
            $("#new_license_count_holder").text(new_licenses);
            $("#current_license_count_holder").text(current_licenses);
            $("#confirm-licenses-modal").modal("show");
        } else {
            exports.create_update_license_request();
        }
    });

    $("#confirm-license-update-button").on("click", () => {
        exports.create_update_license_request();
    });

    $("#update-licenses-at-next-renewal-button").on("click", (e) => {
        e.preventDefault();
        helpers.create_ajax_request(
            "/json/billing/plan",
            "licensechange",
            undefined,
            ["licenses_at_next_renewal"],
            ["licenses"],
            undefined,
            "PATCH",
        );
    });

    $("#change-plan-status").on("click", (e) => {
        helpers.create_ajax_request(
            "/json/billing/plan",
            "planchange",
            undefined,
            ["status"],
            undefined,
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
