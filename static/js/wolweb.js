var readOnly = false;

$(document).ready(function () {
    readOnly = (document.querySelector("body").dataset.readOnly == "true");
    jQuery.showToast = function (data) {
        var timeout = 3000

        // Check if provided data contains errors
        if (!data.success || data.error != null) {
            Toast.create({
                title: "Error",
                message: data.message || "Something went wrong",
                status: TOAST_STATUS.DANGER,
                timeout: timeout
            });
        } else {
            Toast.create({
                title: "Success",
                message: data.message,
                status: TOAST_STATUS.SUCCESS,
                timeout: timeout
            });
        }
    };

    jQuery.wakeUpDeviceByName = function (deviceName) {
        $.ajax({
            type: "GET",
            url: (vDir == "/" ? "" : vDir) + "/wake/" + deviceName,
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            success: function (data) {
                $.showToast(data.responseJSON ?? data);
            },
            error: function (data, err) {
                $.showToast(data.responseJSON ?? data);
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
        data.error = true;
        data.message = "Unable to retrieve device data!";
        $.showToast(data);
        console.error(data);
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
        name: "command", title: "Action",
        type: "control",
        width: 125,
        modeSwitchButton: false,
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
        insertTemplate: function () { return "" },
        filterTemplate: function () { return "" }
    });

    // Modify Data Column
    gridFields.push({
        name: "control", type: "bscontrol", width: 100,
        editButton: false, deleteButton: false, modeSwitchButton: true,

        // Button controls when displaying devices
        itemTemplate: function (value, item) {
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
                    class: "btn btn-outline-secondary btn-xs",
                    role: "button",
                    title: jsGrid.fields.control.prototype.editButtonTooltip,
                    disabled: true
                })
                .append($editIcon);
            var $customDeleteButton = $("<button>")
                .attr({
                    class: "btn btn-outline-secondary btn-xs",
                    role: "button",
                    title: jsGrid.fields.control.prototype.deleteButtonTooltip,
                    disabled: true
                })
                .append($deleteIcon);

                if (!readOnly) {
                    $customEditButton.attr({
                        class: "btn btn-outline-warning btn-xs",
                        disabled: false
                    })
                    $customEditButton.click(function (e) {
                        grid.editItem(item);
                        e.stopPropagation();
                    })
                    $customDeleteButton.attr({
                        class: "btn btn-outline-danger btn-xs",
                        disabled: false
                    })
                    $customDeleteButton.click(function (e) {
                        grid.deleteItem(item);
                        e.stopPropagation();
                    })

                }

            return $("<div>").attr({ class: "btn-group" })
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
                .click(function (e) {
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
                .click(function (e) {
                    grid.cancelEdit();
                    e.stopPropagation();
                })
                .append($cancelEditIcon);

            return $("<div>").attr({ class: "btn-group" })
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
                    class: "btn btn-outline-primary btn-xs",
                    role: "button",
                    title: "Save device to list"
                })
                .click(function (e) {
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
                    title: "Cancel insert"
                })
                .click(function (e) {
                    grid.clearInsert();

                    isInserting = false;
                    grid.option("inserting", isInserting);
                    e.stopPropagation();
                })
                .append($clearInsertIcon);

            return $("<div>").attr({ class: "btn-group" })
                .append($customInsertButton)
                .append($customCancelEditButton);
        },

        // Button controls for filtering items
        filterTemplate: function () {
            var grid = this._grid;
            var $filterIcon = $("<i>").attr({
                class: "bi bi-filter",
                style: "position: relative; top: -3px; left: -6px;"
            });
            var $clearFilterIcon = $("<i>").attr({
                class: "bi bi-x-lg",
                style: "position: relative; top: -3px; left: -6px;"
            });

            var $customFilterButton = $("<button>")
                .attr({
                    class: "btn btn-outline-info btn-xs",
                    role: "button",
                    title: "Save device to list"
                })
                .click(function (e) {
                    grid.loadData();
                    e.stopPropagation();
                })
                .append($filterIcon);
            var $customCancelFilterButton = $("<button>")
                .attr({
                    class: "btn btn-outline-secondary btn-xs",
                    role: "button",
                    title: "Cancel filter"
                })
                .click(function (e) {
                    grid.clearFilter();

                    isFiltering = false;
                    grid.option("filtering", isFiltering);
                    e.stopPropagation();
                })
                .append($clearFilterIcon);

            return $("<div>").attr({ class: "btn-group" })
                .append($customFilterButton)
                .append($customCancelFilterButton);
        }
    });

    // Define jsGrid Configuration
    $("#GridDevices").jsGrid({
        height: "auto",
        width: gridWidth,

        filtering: false,
        inserting: false,
        editing: true,
        selecting: true,
        sorting: false,
        paging: true,

        rowClick: function (args) {
            args.cancel = true;
        },

        noDataContent: "No devices found",

        pageIndex: 1,
        pageSize: 15,
        pagerFormat: "Pages: {prev} {pages} {next}",

        confirmDeleting: true,
        deleteConfirm: "Are you sure you want to delete this device?",

        data: appData.devices,
        fields: gridFields,
        controller: {
            data: appData.devices,
            loadData: function (filter) {
                return $.grep(this.data, function (item) {
                    // Check if all the fields are empty
                    var all_empty = true;
                    for (var field in filter) {
                        if (filter[field]) {
                            all_empty = false;
                        }
                    }

                    // If all the search fields are empty return all the rows
                    if (all_empty) { return true; }

                    // If some search field has content check if it matches the table entries
                    for (var field in filter) {
                        // Ignore the search in empty fields
                        if (!filter[field]) {
                            continue;
                        }
                        if (item[field].toUpperCase().indexOf(filter[field].toUpperCase()) >= 0) {
                            return true;
                        }
                    }

                    return false;
                });
            },
        },
        updateOnResize: true,

        onRefreshed: function () {
            performBSPagerConversion();
        },
        onItemInserted: saveInsertedData,
        onItemDeleted: saveAppData,
        onItemUpdated: saveAppData
    });

    // External Grid Control
    $("#device-insert-btn").on("click", function () {
        $("#GridDevices").jsGrid("option", "inserting", true);
    });
    $("#device-filter-btn").on("click", function () {
        $("#GridDevices").jsGrid("option", "filtering", true);
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
            $.showToast(data);
            console.log(data)
        },
        error: function (data, err) {
            $.showToast(data);
            console.error(data);
        }
    });
}

function saveInsertedData() {
    saveAppData();
    $(".device-insert-button").click();
}


// jQuery Functions used to manupulate the pager to Bootstrap
function getTextNodesIn(node, includeWhitespaceNodes) {
    var textNodes = [], whitespace = /^\s*$/;

    function getTextNodes(node) {
        if (node.nodeType == 3) {
            if (includeWhitespaceNodes || !whitespace.test(node.nodeValue)) {
                textNodes.push(node);
            }
        } else {
            for (var i = 0, len = node.childNodes.length; i < len; ++i) {
                getTextNodes(node.childNodes[i]);
            }
        }
    }

    getTextNodes(node);
    return textNodes;
}


/*
This function converts the inbuilt pager into a comparable bootstrap
object. This must be executed on each refresh of the page.
*/
function performBSPagerConversion() {
    // Wrap the pagination elements in <ul> and <nav>
    $(".jsgrid-pager").wrap("<ul class='pagination'>").contents().unwrap();
    $(".pagination").wrap("<nav>");

    // Convert child objects to link items
    $(".pagination").children().each(function (i, v) {
        $(v).wrap('<li class="page-item">')
    });
    $(".pagination a").addClass("page-link");

    // Add state classes
    $(".jsgrid-pager-nav-inactive-button")
        .addClass("disabled")
        .parent().addClass("disabled");
    $(".page-item .jsgrid-pager-current-page")
        .parent().addClass('active')
        .contents().wrap("<a class='page-link'>");

    // Wrap any unwrapped text as a span
    var textNodeParent = ".pagination";
    var textnodes = getTextNodesIn($(textNodeParent)[0]);
    for (var i = 0; i < textnodes.length; i++) {
        if ($(textnodes[i]).parent().is(textNodeParent)) {
            $(textnodes[i]).wrap("<span>");
        }
    }

    // Move new spans to upstream parent
    $(".pagination > span").each(function (i, v) {
        var insertDest = ".jsgrid-pager-container nav"
        if (i >= 1) {
            $(v).detach().appendTo(insertDest);
        } else {
            $(v).detach().prependTo(insertDest);
        }
    });
}
