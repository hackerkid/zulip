const Uppy = require('@uppy/core');
const ProgressBar = require('@uppy/progress-bar');
const Tus = require('@uppy/tus');

exports.make_upload_absolute = function (uri) {
    if (uri.indexOf(compose.uploads_path) === 0) {
        // Rewrite the URI to a usable link
        return compose.uploads_domain + uri;
    }
    return uri;
};

exports.get_upload_uri_from_tus_uri = function (uri) {
    const tus_uri_prefix = compose.uploads_domain + "/json/tus_upload";
    const upload_uri_prefix = compose.uploads_domain + "/user_uploads";
    return uri.replace(tus_uri_prefix, upload_uri_prefix);
};

// Show the upload button only if the browser supports it.
exports.feature_check = function (upload_button) {
    if (window.XMLHttpRequest && new XMLHttpRequest().upload) {
        upload_button.removeClass("notdisplayed");
    }
};

exports.get_item = function (key, config) {
    if (!config) {
        throw Error("Missing config");
    }
    if (config.mode === "compose") {
        switch (key) {
        case "textarea":
            return $('#compose-textarea');
        case "send_button":
            return $('#compose-send-button');
        case "send_status_identifier":
            return '#compose-send-status';
        case "send_status":
            return $('#compose-send-status');
        case "send_status_close_button":
            return $('.compose-send-status-close');
        case "send_status_message":
            return $('#compose-error-msg');
        case "file_input_identifier":
            return "#file_input";
        case "source":
            return "compose-file-input";
        case "drag_drop_container":
            return $("#compose");
        default:
            throw Error(`Invalid key name for mode "${config.mode}"`);
        }
    } else if (config.mode === "edit") {
        if (!config.row) {
            throw Error("Missing row in config");
        }
        switch (key) {
        case "textarea":
            return $('#message_edit_content_' + config.row);
        case "send_button":
            return $('#message_edit_content_' + config.row).closest('#message_edit_form').find('.message_edit_save');
        case "send_status_identifier":
            return '#message-edit-send-status-' + config.row;
        case "send_status":
            return $('#message-edit-send-status-' + config.row);
        case "send_status_close_button":
            return $('#message-edit-send-status-' + config.row).find('.send-status-close');
        case "send_status_message":
            return $('#message-edit-send-status-' + config.row).find('.error-msg');
        case "file_input_identifier":
            return '#message_edit_file_input_' + config.row;
        case "source":
            return "message-edit-file-input";
        case "drag_drop_container":
            return $("#message_edit_form");
        default:
            throw Error(`Invalid key name for mode "${config.mode}"`);
        }
    } else {
        throw Error("Invalid upload mode!");
    }
};

exports.hide_upload_status = function (config) {
    exports.get_item("send_button", config).prop("disabled", false);
    exports.get_item("send_status", config).removeClass("alert-info").hide();
};

exports.show_error_message = function (config, message) {
    if (!message) {
        message = i18n.t("An unknown error occurred.");
    }
    exports.get_item("send_button", config).prop("disabled", false);
    exports.get_item("send_status", config).addClass("alert-error").removeClass("alert-info").show();
    exports.get_item("send_status_message", config).text(message);
};

exports.upload_files = function (uppy, config, files) {
    if (files.length === 0) {
        uppy.cancelAll();
        exports.hide_upload_status(config);
        return;
    }
    if (page_params.max_file_upload_size === 0) {
        exports.show_error_message(config, i18n.t('File and image uploads have been disabled for this organization.'));
        return;
    }
    exports.get_item("send_button", config).attr("disabled", "");
    exports.get_item("send_status", config).addClass("alert-info").removeClass("alert-error").show();
    exports.get_item("send_status_message", config).html($("<p>").text(i18n.t("Uploading…")));
    exports.get_item("send_status_close_button", config).one('click', function () {
        uppy.cancelAll();
        setTimeout(function () {
            exports.hide_upload_status(config);
        }, 500);
    });

    for (const file of files) {
        try {
            compose_ui.insert_syntax_and_focus("[Uploading " + file.name + "…]()", exports.get_item("textarea", config));
            compose_ui.autosize_textarea();
            uppy.addFile({
                source: exports.get_item("source", config),
                name: file.name,
                type: file.type,
                data: file,
            });
        } catch (error) {
            // Errors are handled by info-visible and upload-error event callbacks.
        }
    }
};

exports.setup_upload = function (config) {
    const uppy = Uppy({
        debug: true,
        autoProceed: true,
        restrictions: {
            maxFileSize: page_params.max_file_upload_size * 1024 * 1024,
        },
        locale: {
            strings: {
                exceedsSize: i18n.t('This file exceeds maximum allowed size of'),
                failedToUpload: i18n.t('Failed to upload %{file}'),
            },
        },
    });
    uppy.setMeta({
        csrfmiddlewaretoken: csrf_token,
    });
    uppy.use(Tus, {
        endpoint: '/json/tus_upload/',
        resume: true,
        autoRetry: true,
        retryDelays: [0, 1000, 3000, 5000],
    });

    uppy.use(ProgressBar, {
        target: exports.get_item("send_status_identifier", config),
        hideAfterFinish: false,
    });

    $("body").on("change", exports.get_item("file_input_identifier", config), (event) => {
        const files = event.target.files;
        exports.upload_files(uppy, config, files);
    });

    const drag_drop_container = exports.get_item("drag_drop_container", config);
    drag_drop_container.on("dragover", (event) => event.preventDefault());
    drag_drop_container.on("dragenter", (event) => event.preventDefault());

    drag_drop_container.on("drop", (event) => {
        event.preventDefault();
        const files = event.originalEvent.dataTransfer.files;
        exports.upload_files(uppy, config, files);
    });

    drag_drop_container.on("paste", (event) => {
        const clipboard_data = event.clipboardData || event.originalEvent.clipboardData;
        if (!clipboard_data) {
            return;
        }
        const items = clipboard_data.items;
        const files = [];
        for (const item of items) {
            if (item.kind !== "file") {
                continue;
            }
            const file = item.getAsFile();
            files.push(file);
        }
        exports.upload_files(uppy, config, files);
    });

    uppy.on('upload-success', (file, response) => {
        const tus_uri = response.uploadURL;
        if (tus_uri === undefined) {
            return;
        }
        const upload_uri = exports.get_upload_uri_from_tus_uri(tus_uri);
        const split_uri = upload_uri.split("/");
        const filename = split_uri[split_uri.length - 1];
        if (!compose_state.composing()) {
            compose_actions.start('stream');
        }
        const filename_uri = "[" + filename + "](" + upload_uri + ")";
        compose_ui.replace_syntax("[Uploading " + file.name + "…]()", filename_uri, exports.get_item("textarea", config));
        compose_ui.autosize_textarea();
    });

    uppy.on('complete', () => {
        setTimeout(function () {
            uppy.cancelAll();
            exports.hide_upload_status(config);
        }, 500);
    });

    uppy.on('info-visible', () => {
        const info = uppy.getState().info;
        // Ideally we should handle "Upload Error" case here, but info.message
        // don't contain response.body.msg received from the server.
        if (info.type === "error" && info.details !== "Upload Error") {
            uppy.cancelAll();
            exports.show_error_message(config, info.message);
        }
    });

    uppy.on('upload-error', (file, error, response) => {
        const message = response ? response.body.msg : null;
        uppy.cancelAll();
        exports.show_error_message(config, message);
    });

    return uppy;
};

window.upload = exports;
