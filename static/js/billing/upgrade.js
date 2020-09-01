"use strict";

exports.initialize = () => {
    helpers.set_tab("upgrade");

    const stripe = Stripe($("#autopay-form").data("key"));

    $("#add-card-button").on("click", (e) => {
        e.preventDefault();
        const license_management = $("input[type=radio][name=license_management]:checked").val();
        if (helpers.is_valid_input($("#" + license_management + "_license_count")) === false) {
            return;
        }
        stripe.redirectToCheckout({
            // Make the id field from the Checkout Session creation API response
            // available to this file, so you can provide it as argument here
            // instead of the {{CHECKOUT_SESSION_ID}} placeholder.
            sessionId: $("#autopay-form").data("session-id")
          }).then(function (result) {
            // If `redirectToCheckout` fails due to a browser or network
            // error, display the localized error message to your customer
            // using `result.error.message`.
        });
    });

    $("#invoice-button").on("click", (e) => {
        if (helpers.is_valid_input($("#invoiced_licenses")) === false) {
            return;
        }
        e.preventDefault();
        helpers.create_ajax_request("/json/billing/upgrade", "invoice", undefined, ["licenses"]);
    });

    $("#sponsorship-button").on("click", (e) => {
        if (!helpers.is_valid_input($("#sponsorship-form"))) {
            return;
        }
        e.preventDefault();
        helpers.create_ajax_request(
            "/json/billing/sponsorship",
            "sponsorship",
            undefined,
            undefined,
            "/",
        );
    });

    const prices = {};
    prices.annual = page_params.annual_price * (1 - page_params.percent_off / 100);
    prices.monthly = page_params.monthly_price * (1 - page_params.percent_off / 100);

    $("input[type=radio][name=license_management]").on("change", function () {
        helpers.show_license_section(this.value);
    });

    $("input[type=radio][name=schedule]").on("change", function () {
        helpers.update_charged_amount(prices, this.value);
    });

    $("select[name=organization-type]").on("change", function () {
        helpers.update_discount_details(this.value);
    });

    $("#autopay_annual_price").text(helpers.format_money(prices.annual));
    $("#autopay_annual_price_per_month").text(helpers.format_money(prices.annual / 12));
    $("#autopay_monthly_price").text(helpers.format_money(prices.monthly));
    $("#invoice_annual_price").text(helpers.format_money(prices.annual));
    $("#invoice_annual_price_per_month").text(helpers.format_money(prices.annual / 12));

    helpers.show_license_section($("input[type=radio][name=license_management]:checked").val());
    helpers.update_charged_amount(prices, $("input[type=radio][name=schedule]:checked").val());
};

window.upgrade = exports;

$(() => {
    exports.initialize();
});
