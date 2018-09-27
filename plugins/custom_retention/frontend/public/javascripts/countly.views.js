window.customRetentionView = countlyView.extend({
    initialize: function(){

    },
    beforeRender: function() {
        if(this.template) {
            return $.when(customRetention.initialize()).then(function () {});
        } else {
            var self = this;
            return $.when($.get(countlyGlobal["path"]+'/custom_retention/templates/customretention.html', function(src){
                self.template = Handlebars.compile(src);
            }), customRetention.initialize()).then(function () {});
        }
    },
    renderCommon:function (isRefresh) {
        var self = this;
        this.templateData = {
            "page-title":jQuery.i18n.map["custom-retention.title"]
        };
        if(!isRefresh) {
            $(this.el).html(self.template(this.templateData));
        }
        self.updateView();
    },
    refresh:function () {
        var self = this;
        $.when(customRetention.refresh()).then(function () {
            if (app.activeView != self) {
                return false;
            }
            self.renderCommon(true);
        });
    },
    updateView: function () {
        var tableData = customRetention.getRetentionData();
        //console.log(JSON.stringify(tableData));
        var columnsDef = [];
        columnsDef.push({
            "bSortable":false,
            "sWidth":"40px",
            "mData":"date",
            "mRender":function(data, type) {
                return moment(data).format("MM-DD");
            },
            "sType": "date",
            "sTitle": jQuery.i18n.map['custom-retention.date']
        });
        columnsDef.push({
            "bSortable":false,
            "sWidth":"50px",
            "mData":"new",
            "mRender":function(data, type) {
                return data;
            },
            "sType": "numeric",
            "sTitle": jQuery.i18n.map['custom-retention.new-user']
        });
        for (var i=1; i <= 30; i++) {
            columnsDef.push({
                "bSortable":false,
                "sWidth":"30px",
                "mData":"retention",
                "mRender":(function (inx, data, type) {
                    return function(data, type) {
                        if(data.length > inx) {
                            var retention = data[inx];
                            return countlyCommon.getShortNumber((retention*100).toFixed(1)) + "%";
                        }
                        return null;
                    };
                })(i-1),
                "sType": "string",
                "sTitle": "+"+i
            });
        }
        this.dtable = $('#dataTableOne').dataTable($.extend({}, $.fn.dataTable.defaults, {
            "aaData": tableData,
            "fnRowCallback": function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
                $('td', nRow).attr('style', 'text-align: right;');
            },
            "aoColumns":columnsDef,
            "sScrollX": "100%",
            "sScrollY": "100%",
            "bScrollCollapse": true,
            "bAutoWidth": false,
            fixedColumns: {
                leftColumns: 2
            }
        }));

        this.dtable.stickyTableHeaders();
    },
});

//register views
app.customRetentionView = new customRetentionView();

app.route('/analytics/custom-retention', 'custom-retention', function () {
    this.renderWhenReady(this.customRetentionView);
});

$(document).ready(function () {
    var menu = '<a href="#/analytics/custom-retention" class="item" ">' +
        '<div class="logo fa fa-plugin" style="background-image:none; font-size:24px; text-align:center; width:35px; margin-left:14px; line-height:42px;"></div>' +
        '<div class="text" data-localize="custom-retention.title"></div>' +
        '</a>';

    $('.sidebar-menu #engagement-submenu').append(menu);
});
