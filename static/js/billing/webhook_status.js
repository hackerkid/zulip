function handle_upgrade_complete_event() {
    $("#webhook-loading").hide();
    $("#webhook-success").show();
    $("#webhook-success").text("Your upgrade is complete. You would be redirected to the billing page soon.")
    setTimeout(() => {
        window.location.replace("/billing");
    }, 5000);
}

function handle_card_update_complete_event () {
    $("#webhook-loading").hide();
    $("#webhook-success").show();
    $("#webhook-success").text("Your card has been updated. You would be redirected to the billing page soon.")
    setTimeout(() => {
        window.location.replace("/billing#payment-method");
    }, 5000);
}

function handle_upgrade_error_event (response) {
    $("#webhook-loading").hide();
    $("#webhook-error").show();
    $("#webhook-error").html(response.message);
}

function update_webhook_status (session_id) {
    setTimeout(() => {
        $.get("/json/billing/session/status", {session_id: session_id}, function (response) {
            if (response.status === "checkout_started" || response.status === "checkout_completed") {
                update_webhook_status(session_id);
            } else if (response.status === "upgrade_completed") {
              handle_upgrade_complete_event();
            } else if (response.status === "card_update_completed") {
                handle_card_update_complete_event();
            }
            else if (response.status === "upgrade_error") {
                handle_upgrade_error_event(response);
            }
        });
    }, 2000)
}

exports.initialize = function () {
    const form_loading = "#webhook-loading";
    const form_loading_indicator = "#webhook_loading_indicator";

    loading.make_indicator($(form_loading_indicator), {
        text: "Processing ...",
        abs_positioned: true,
    });
    $(form_loading).show();

    const session_id = $("#session-info").attr("data-session-id");
    update_webhook_status(session_id);
};

window.billing = exports;

$(() => {
    exports.initialize();
});
