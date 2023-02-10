$(document).ready(function () {

    jQuery.showSnackBar = function (data) {

        $('#snackbar').text(data.message);
        if (data.error != null) {
            $('#snackbar').addClass('alert-danger');
            $('#snackbar').removeClass('alert-success')
        } else {
            $('#snackbar').removeClass('alert-danger')
            $('#snackbar').addClass('alert-success')
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

    BSControl.prototype = new jsGrid.ControlField({

        _createInsertButton: function () {
            var grid = this._grid;
            return $("<button>").addClass("btn btn-dark btn-sm")
                .attr({ type: "button", title: "Add this device to the list." })
                .html("<i class=\"fas fa-save\"></i>SAVE")
                .on("click", function () {
                    grid.insertItem().done(function () {
                        grid.clearInsert();
                    });
                });
        },

        _createEditButton: function (item) {
            var grid = this._grid;
            return $("<button class=\"btn btn-sm btn-light m-0 p-1\" title=\"" + this.editButtonTooltip + "\">").append("<i class=\"fas fa-edit bs-grid-button text-success m-0 p-0\">").click(function (e) {
                grid.editItem(item);
                e.stopPropagation();
            });
        },

        _createDeleteButton: function (item) {
            var grid = this._grid;
            return $("<button class=\"btn btn-sm btn-light m-0 ml-1 p-1\" title=\"" + this.deleteButtonTooltip + "\">").append("<i class=\"fas fa-trash-alt bs-grid-button text-danger m-0 p-0\">").click(function (e) {
                grid.deleteItem(item);
                e.stopPropagation();
            });
        },

        _createUpdateButton: function () {
            var grid = this._grid;
            return $("<button class=\"btn btn-sm btn-light m-0 ml-1 p-1\" title=\"" + this.updateButtonTooltip + "\">").append("<i class=\"fas fa-save bs-grid-button text-success m-0 p-0\">").click(function (e) {
                grid.updateItem();
                e.stopPropagation();
            });
        },

        _createCancelEditButton: function () {
            var grid = this._grid;
            return $("<button class=\"btn btn-sm btn-light m-0 ml-1 p-1\" title=\"" + this.cancelEditButtonTooltip + "\">").append("<i class=\"fas fa-window-close bs-grid-button text-danger m-0 p-0\">").click(function (e) {
                grid.cancelEdit();
                e.stopPropagation();
            });
        },

    });

    jsGrid.fields.bscontrol = BSControl;

    var gridFields = [];
    var gridWidth = "700px";

    gridFields.push({ name: "name", title: "Device", type: "text", width: 150, validate: { validator: "required", message: "Device name is a required field." } });
    gridFields.push({ name: "mac", title: "MAC Adress", type: "text", width: 150, validate: { validator: "pattern", param: /^[0-9a-f]{1,2}([\.:-])(?:[0-9a-f]{1,2}\1){4}[0-9a-f]{1,2}$/gmi, message: "MAC Address is a required field." } });
    gridFields.push({
        name: "ip", title: "Broadcast IP", type: "text", width: 150, validate: { validator: "required", message: "Broadcast IP Address is a required field." },
        insertTemplate: function () {
            var $result = jsGrid.fields.text.prototype.insertTemplate.call(this); // original input
            // $result.attr("disabled", true).css("background", "lightgray").val(bCastIP);
            $result.val(bCastIP);
            return $result;
        },
        // editing: false
    });
    gridFields.push({
        name: "command", type: "control", width: 125, modeSwitchButton: false,
        itemTemplate: function (value, item) {
            return $("<button>").addClass("btn btn-primary btn-sm")
                .attr({ type: "button", title: "Send magic packet" })
                .html("<i class=\"fas fa-bolt\"></i>WAKE-UP")
                .on("click", function () {
                    $.wakeUpDeviceByName(item.name)
                });
        },
        editTemplate: function (value, item) { return "" },
        insertTemplate: function () { return "" }
    });
    gridFields.push({
        name: "control", type: "bscontrol", width: 100, editButton: true, deleteButton: true, modeSwitchButton: true,
        headerTemplate: function () {
            var grid = this._grid;
            var isInserting = grid.inserting;
            var $button = $("<button>").addClass("btn btn-info btn-sm device-insert-button")
                .attr({ type: "button", title: "Add new Device" })
                .html("<i class=\"fas fa-plus\"></i>NEW")
                .on("click", function () {
                    isInserting = !isInserting;
                    grid.option("inserting", isInserting);
                });
            return $button;
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
        deleteConfirm: "Are you sure you want to delete this Device?",
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
