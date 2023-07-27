Vue.component("map-gl", {
    template:'<div ref="map" id="map"></div>',
    props: {
        showArea: {//是否需要画部署区域范围
            type: Boolean,
            default: () => false
        },
        bMap:{//地图类型，若是gl 传BMapGL
            type: Object,
            default: () => BMap
        },
        zoom:{//地图默认缩放级别
            type: Number,
            default: () => 16
        }
    },
    data: function () {
        return {
            map:null,
        }
    },
    created() {

    },
    mounted() {
        this.initMap();
    },
    methods: {
        initMap(){
            this.map = new this.bMap.Map("map");    // 创建Map实例 ,{minZoom:15,maxZoom:17}
            this.getMapCenter();
            //map.centerAndZoom(new BMap.Point(103.80434,30.19809), 16);
            //设置可视范围
            /* var b = new BMap.Bounds(new BMap.Point(103.770733,30.16766),new BMap.Point(103.839993,30.222083)); // 范围 左下角，右上角的点位置
             try {    // js中尽然还有try catch方法，可以避免bug引起的错误
                 BMapLib.AreaRestriction.setBounds(map, b); // 已map为中心，已b为范围的地图
             } catch (e) {
                 // 捕获错误异常
                 console.warn(e);
             }*/
            this.map.setMapType(BMAP_SATELLITE_MAP);
            this.map.enableScrollWheelZoom(true);
            //设置瓦片
            this.setTileLayer();
        },
        setTileLayer(){
            var bounds = null;
            var imgOverlay = null;
            //设置自定义贴图
            var pStart = new this.bMap.Point(103.7849208,30.214988);
            var pEnd = new this.bMap.Point(103.823895,30.175637);
            if(this.bMap.version=="gl"){
                // 定义XYZLayer图层
               /* var custom = new BMapGL.XYZLayer({
                    useThumbData: true,
                    minZoom: 4,
                    maxZoom: 20,
                    tileUrlTemplate: ctx+'/trunk/js/baiduMap/tile/[z]/[x]_[y].png',
                    // tileUrlTemplate: 'https://mapopen-pub-jsapigl.cdn.bcebos.com/tms-bj/[z]/[x]/[y].png',
                    // 自定义图层瓦片请求地址，
                    // 可使用xTemplate，yTemplate，zTemplate匹配自定义网格编号规则
                    /!*yTemplate: function (x, y, z) {
                        return Math.pow(2, z) - y - 1;
                    }*!/
                });
                this.map.addTileLayer(custom);*/

                bounds = new this.bMap.Bounds(new this.bMap.Point(pStart.lng, pStart.lat), new this.bMap.Point(pEnd.lng, pEnd.lat));
                imgOverlay = new this.bMap.GroundOverlay(bounds, {
                    type: 'image',
                    url: ctx+'/trunk/js/baiduMap/tile/1.png',
                    opacity: 1
                });
                imgOverlay.setZIndex(100);
            }else{
                bounds = new this.bMap.Bounds(new this.bMap.Point(pStart.lng, pEnd.lat), new this.bMap.Point(pEnd.lng, pStart.lat));
                imgOverlay = new this.bMap.GroundOverlay(bounds, {
                    type: 'image',
                    imageURL: ctx+'/trunk/js/baiduMap/tile/1.png',
                    opacity: 1
                });
                imgOverlay.disableMassClear();
                this.map.addOverlay(imgOverlay);
                /*var nameFormat = "{x}_{y}";
                var ext = ".png";
                // 增加瓦片图层
                var tileLayer = new this.bMap.TileLayer();
                tileLayer.getTilesUrl = function(tileCoord, zoom) {
                    var name = nameFormat
                        .replace("{x}", tileCoord.x)
                        .replace("{y}", tileCoord.y)
                        .replace("{z}", zoom)
                    ;
                    return ctx + '/trunk/js/baiduMap/tile/' + zoom + '/' + name + ext;
                }
                this.map.addTileLayer(tileLayer);*/
            }


        },
        getMapCenter(){
            var jw = [];
            $.ajax({
                url : ctx+"/region/getSysCoordinate.do",
                type : "post",
                async:false,
                success : function(result) {
                    if(result!=""){
                        jw = result.split(",");
                    }
                }
            });
            if(jw.length==0){
                //获取系统部署区域
                $.ajax({
                    url : ctx+"/region/getRegionConfigName.do",
                    type : "post",
                    async:false,
                    success : (result) => {
                        if(result!=""){
                            var city = result;
                            if(this.showArea == "true"){
                                this.getBoundary(city);
                            }

                        }else{
                            city = "北京市"
                        }
                        var myGeo = new this.bMap.Geocoder();
                        // 将地址解析结果显示在地图上，并调整地图视野
                        myGeo.getPoint(city, (point) => {
                            if(point){
                                this.map.centerAndZoom(point, this.zoom);
                            }else{
                                console.log('系统部署区域地址没有解析到结果！');
                            }
                        }, '北京市')
                    },
                    error:() => {
                        jw = [103.80434,30.19809];
                    }
                });
            }else{
                this.map.centerAndZoom(new this.bMap.Point(jw[0], jw[1]), this.zoom);
                if(this.showArea == "true"){
                    $.ajax({
                        url : ctx+"/region/getRegionNameByLngLat.do",
                        type : "post",
                        async:false,
                        data:{longitude:jw[0],latitude:jw[1]},
                        success : function(result) {
                            console.log(result)
                            if(result!=""){
                                var city = result;
                                this.getBoundary(city);

                            }
                        }
                    });
                }
            }
        },
        getBoundary(name){
            var bdary = new this.bMap.Boundary();
            bdary.get(name, function (rs) {       //获取行政区域
                //  map.clearOverlays();        //清除地图覆盖物
                var count = rs.boundaries.length; //行政区域的点有多少个
                for (var i = 0; i < count; i++) {
                    var ply = new this.bMap.Polygon(rs.boundaries[i], {
                        enableMassClear: false,
                        strokeWeight: 1.5,
                        strokeStyle: "dashed",
                        strokeColor: "#9d9f9f",
                        fillColor: "#1f57ec",
                        fillOpacity: 0.04
                    }); //建立多边形覆盖物
                    this.map.addOverlay(ply);  //添加覆盖物
                    //  map.setViewport(ply.getPath());    //调整视野
                }
            });
        }
    }
})