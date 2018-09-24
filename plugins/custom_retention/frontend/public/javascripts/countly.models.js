(function (customRetention, $) {
    //Private Properties
    var _retentionData = [],
        _name = "custom_retention",
        _period = null;

    //Public Methods
    customRetention.initialize = function () {
        return this.refresh();
    };

    customRetention.refresh = function () {
        if(_period == countlyCommon.getPeriodForAjax()) {
            return false;
        }
        console.log("data refresh");
        _period = countlyCommon.getPeriodForAjax();

        if (!countlyCommon.DEBUG) {

            return $.ajax({
                    type:"GET",
                    url:countlyCommon.API_PARTS.data.r,
                    data:{
                        "api_key":countlyGlobal.member.api_key,
                        "app_id":countlyCommon.ACTIVE_APP_ID,
                        "method":_name,
                        "period":_period
                    },
                    dataType:"jsonp",
                    success:function (json) {
                        _retentionData = json.map(function(d){
                            d.date = moment(d.date, "YYYY-M-D").valueOf();
                            return d;
                        });
                    }
                });
        } else {
            return true;
        }
    };

    customRetention.reset = function () {
        _retentionData = [];
    };
    
    
    customRetention.getRetentionData = function () {
        return _retentionData;
    };
})(window.customRetention = window.customRetention || {}, jQuery);
