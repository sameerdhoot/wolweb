$(document).ready(function () {

    jQuery.showSnackBar = function (data) {

        $('#snackbar > .alert-text > p').text(data.message);
        if (data.error != null) {
            $('#snackbar').addClass('alert-error');
            $('#snackbar > .alert-icon > i').addClass('bi-exclamation-triangle-fill');
            $('#snackbar').removeClass('alert-success');
            $('#snackbar > .alert-icon > i').removeClass('bi-check-circle-fill');
            
            $('#snackbar > .alert-text > h5').text("Error");
        } else {
            $('#snackbar').addClass('alert-success');
            $('#snackbar > .alert-icon > i').addClass('bi-check-circle-fill')
            $('#snackbar').removeClass('alert-error');
            $('#snackbar > .alert-icon > i').removeClass('bi-exclamation-triangle-fill');

            $('#snackbar > .alert-text > h5').text('Success');
        }
        $('#snackbar').show();

        // After 2 seconds, hide the Div Again
        setTimeout(function () {
            $('#snackbar').hide();
        }, 2000);
    };

    jQuery.wakeUpDeviceByName = function (deviceName) {
        $.ajax({
            type: "GET",
            url: (vDir == "/" ? "" : vDir) + "/wake/" + deviceName,
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            success: function (data) {
                $.showSnackBar(data);
            },
            error: function (data, err) {
                $.showSnackBar(data);
                console.error(data);
            }
        })
    };

    getAppData();

});

function getAppData() {

    $.getJSON((vDir == "/" ? "" : vDir) + "/data/get", function (data) {
        window.appData = data;
        if (!appData.devices) {
            appData.devices = [];
        }
        renderData();
    }).fail(function (data) {
        alert("Error: Problem with getting data from the service.");
    });

}

function renderData() {

    var BSControl = function (config) {
        jsGrid.ControlField.call(this, config);
    };

    BSControl.prototype = new jsGrid.ControlField({});
    jsGrid.fields.bscontrol = BSControl;

    var gridFields = [];
    var gridWidth = "100%";

    // Device Column
    gridFields.push({
        name: "name", title: "Device",
        type: "text",
        width: null,
        validate: {
            validator: "required",
            message: "Device name is a required field."
        }
    });

    // MAC Address Column
    gridFields.push({
        name: "mac", title: "MAC Address",
        type: "text",
        width: null,
        validate: {
            validator: "pattern",
            param: /^[0-9a-f]{1,2}([\.:-])(?:[0-9a-f]{1,2}\1){4}[0-9a-f]{1,2}$/gmi,
            message: "MAC Address is a required field."
        }
    });

    // Broadcast IP Column
    gridFields.push({
        name: "ip", title: "Broadcast IP",
        type: "text",
        width: null,
        validate: {
            validator: "required",
            message: "Broadcast IP Address is a required field."
        },
        insertTemplate: function () {
            var $result = jsGrid.fields.text.prototype.insertTemplate.call(this); // original input
            // $result.attr("disabled", true).css("background", "lightgray").val(bCastIP);
            $result.val(bCastIP);
            return $result;
        },
        // editing: false
    });

    // Wake-up Action Column
    gridFields.push({
        name: "command", type: "control", width: 125, modeSwitchButton: false,
        itemTemplate: function (value, item) {
            var $wakeUpIcon = $("<i>").attr({
                class: "bi bi-lightning-fill",
                style: "margin-right: 6px"
            });

            return $("<button>")
                .attr({
                    class: "btn btn-primary btn-sm",
                    type: "button",
                    title: "Send magic packet" 
                })
                .append($wakeUpIcon)
                .append("WAKE-UP")
                .on("click", function () {
                    $.wakeUpDeviceByName(item.name)
                });
        },
        editTemplate: function (value, item) { return "" },
        insertTemplate: function () { return "" }
    });

    // Modify Data Column
    gridFields.push({
        name: "control", type: "bscontrol", width: 100, editButton: false, deleteButton: false, modeSwitchButton: true,

        // Button controls for adding new items (First Row)
        headerTemplate: function () {
            var grid = this._grid;
            var isInserting = grid.inserting;
            var $insertIcon = $("<i>").attr({
                class: "bi bi-plus-lg",
                style: "margin-right: 6px; -webkit-text-stroke: 1px"
            });

            var $button = $("<button>")
                .attr({
                    class: "btn btn-info btn-sm device-insert-button",
                    type: "button",
                    title: "Add new Device"
                })
                .append($insertIcon)
                .append("NEW")
                .on("click", function () {
                    grid.clearInsert();

                    isInserting = true;
                    grid.option("inserting", isInserting);
                });

            return $button;
        },

        // Button controls when displaying devices
        itemTemplate: function(value, item) {
            var grid = this._grid;
            var $editIcon = $("<i>").attr({
                class: "bi bi-pencil-square",
                style: "position: relative; top: -3px; left: -6px;"
            });
            var $deleteIcon = $("<i>").attr({
                class: "bi bi-trash-fill",
                style: "position: relative; top: -3px; left: -6px;"
            });

            var $customEditButton = $("<button>")
                .attr({
                    class: "btn btn-outline-warning btn-xs",
                    role: "button",
                    title: jsGrid.fields.control.prototype.editButtonTooltip
                })
                .click(function(e) {
                    grid.editItem(item);
                    e.stopPropagation();
                })
                .append($editIcon);
            var $customDeleteButton = $("<button>")
                .attr({
                    class: "btn btn-outline-danger btn-xs",
                    role: "button",
                    title: jsGrid.fields.control.prototype.deleteButtonTooltip
                })
                .click(function(e) {
                    grid.deleteItem(item);
                    e.stopPropagation();
                })
                .append($deleteIcon);
    
            return $("<div>").attr({class: "btn-group"})
                .append($customEditButton)
                .append($customDeleteButton);
        },

        // Button controls when editing existing devices
        editTemplate: function () {
            var grid = this._grid;
            var $updateIcon = $("<i>").attr({
                class: "bi bi-check-lg",
                style: "position: relative; top: -3px; left: -6px;"
            });
            var $cancelEditIcon = $("<i>").attr({
                class: "bi bi-x-lg",
                style: "position: relative; top: -3px; left: -6px;"
            });

            var $customUpdateButton = $("<button>")
                .attr({
                    class: "btn btn-outline-success btn-xs",
                    role: "button",
                    title: jsGrid.fields.control.prototype.updateButtonTooltip
                })
                .click(function(e) {
                    grid.updateItem();
                    e.stopPropagation();
                })
                .append($updateIcon);
            var $customCancelEditButton = $("<button>")
                .attr({
                    class: "btn btn-outline-secondary btn-xs",
                    role: "button",
                    title: jsGrid.fields.control.prototype.cancelEditButtonTooltip
                })
                .click(function(e) {
                    grid.cancelEdit();
                    e.stopPropagation();
                })
                .append($cancelEditIcon);
    
            return $("<div>").attr({class: "btn-group"})
                .append($customUpdateButton)
                .append($customCancelEditButton);
        },

        // Button controls for inserting new items
        insertTemplate: function () {
            var grid = this._grid;
            var isInserting = grid.inserting;
            var $saveIcon = $("<i>").attr({
                class: "bi bi-save",
                style: "position: relative; top: -3px; left: -6px;"
            });
            var $clearInsertIcon = $("<i>").attr({
                class: "bi bi-x-lg",
                style: "position: relative; top: -3px; left: -6px;"
            });

            var $customInsertButton = $("<button>")
                .attr({
                    class: "btn btn-outline-dark btn-xs",
                    role: "button",
                    title: "Save device to list"
                })
                .click(function(e) {
                    grid.insertItem().done(function () {
                        grid.clearInsert();
                    });
                    e.stopPropagation();
                })
                .append($saveIcon);
            var $customCancelEditButton = $("<button>")
                .attr({
                    class: "btn btn-outline-secondary btn-xs",
                    role: "button",
                    title: jsGrid.fields.control.prototype.cancelInsertButtonTooltip
                })
                .click(function(e) {
                    grid.clearInsert();
                    
                    isInserting = false;
                    grid.option("inserting", isInserting);
                    e.stopPropagation();
                })
                .append($clearInsertIcon);
    
            return $("<div>").attr({class: "btn-group"})
                .append($customInsertButton)
                .append($customCancelEditButton);
        }
    });

    $("#GridDevices").jsGrid({
        height: "auto",
        width: gridWidth,
        updateOnResize: true,
        editing: true,
        inserting: false,
        sorting: false,
        confirmDeleting: true,
        deleteConfirm: "Are you sure you want to delete this device?",
        data: appData.devices,
        fields: gridFields,
        rowClick: function (args) {
            args.cancel = true;
        },
        onItemInserted: saveInsertedData,
        onItemDeleted: saveAppData,
        onItemUpdated: saveAppData
    });

}

function saveAppData() {

    $.ajax({
        type: "POST",
        url: (vDir == "/" ? "" : vDir) + "/data/save",
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        data: JSON.stringify(appData),
        success: function (data) {
            $.showSnackBar(data);
        },
        error: function (data, err) {
            $.showSnackBar(data);
            console.error(data);
        }
    });

}

function saveInsertedData() {

    saveAppData();
    $(".device-insert-button").click();

}
