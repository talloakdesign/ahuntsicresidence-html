mxn.register('googlev3', {

Mapstraction: {
	
	init: function(element, api, properties){
		var me = this;
		
		if (typeof google.maps.Map === 'undefined') {
			throw new Error(api + ' map script not imported');
		}

		this.defaultBaseMaps = [
			{
				mxnType: mxn.Mapstraction.ROAD,
				providerType: google.maps.MapTypeId.ROADMAP,
				nativeType: true
			},
			{
				mxnType: mxn.Mapstraction.SATELLITE,
				providerType: google.maps.MapTypeId.SATELLITE,
				nativeType: true
			},
			{
				mxnType: mxn.Mapstraction.HYBRID,
				providerType: google.maps.MapTypeId.HYBRID,
				nativeType: true
			},
			{
				mxnType: mxn.Mapstraction.PHYSICAL,
				providerType: google.maps.MapTypeId.TERRAIN,
				nativeType: true
			}
		];
		this.initBaseMaps();

		this.controls = {
			pan: false,
			zoom: false,
			overview: false,
			scale: false,
			map_type: false,
			streetview: false,
			view45degree: false
		};
		
		var options = {
			disableDefaultUI: true,
			disableDoubleClickZoom: true,
			draggable: true,
			mapTypeControl: false,
			mapTypeId: google.maps.MapTypeId.ROADMAP,
			overviewMapControl: false,
			streetViewControl: false,
			tilt: 0,
			panControl: false,
			scaleControl: false,
			scrollwheel: false,
			zoomControl: false
		};
		
		// Background color can only be set at construction time.
		// To provide some control, adopt any explicit element style.
		var background = null;
		if (element.currentStyle) {
			background = element.currentStyle['background-color'];
		}
		else if (window.getComputedStyle) {
			background = document.defaultView.getComputedStyle(element, null).getPropertyValue('background-color');
		}
		
		// Only set the background if a style has been explicitly set, ruling out the
		// "transparent" default
		if (background && 'transparent' !== background) {
			options.backgroundColor = background;
		}

		if (typeof properties !== 'undefined' && properties !== null) {
			if (properties.hasOwnProperty('controls')) {
				var controls = properties.controls;
				
				if ('pan' in controls && controls.pan) {
					options.panControl = true;
					this.controls.pan = true;
				}
				
				if ('zoom' in controls) {
					if (controls.zoom || controls.zoom === 'small') {
						options.zoomControl = true;
						options.zoomControlOptions = {
							style: google.maps.ZoomControlStyle.SMALL
						};
						this.controls.zoom = 'small';
					}
					
					else if (controls.zoom === 'large') {
						options.zoomControl = true;
						options.zoomControlOptions = {
							style: google.maps.ZoomControlStyle.LARGE
						};
						this.controls.zoom = 'large';
					}
				}
				
				if ('overview' in controls && controls.overview) {
					options.overviewMapControl = true;
					options.overviewMapControlOptions = {
						opened: true
					};
					this.controls.overview = true;
				}
				
				if ('scale' in controls && controls.scale) {
					options.scaleControl = true;
					options.scaleControlOptions = {
						style: google.maps.ScaleControlStyle.DEFAULT
					};
					this.controls.scale = true;
				}
				
				if ('map_type' in controls && controls.map_type) {
					options.mapTypeControl = true;
					options.mapTypeControlOptions = {
						style: google.maps.MapTypeControlStyle.DEFAULT
					};
					this.controls.map_type = true;
				}
				
				if ('streetview' in controls && controls.streetview) {
					options.streetViewControl = true;
					options.streetViewControlOptions = {
					};
					this.controls.streetview = true;
				}
				
				if ('view45degree' in controls && controls.view45degree) {
					options.tilt = 45;
				}
			}
			
			if (properties.hasOwnProperty('center') && null !== properties.center) {
				var point;
				if (Object.prototype.toString.call(properties.center) === '[object Array]') {
					point = new mxn.LatLonPoint(properties.center[0], properties.center[1]);
				}
				else {
					point = properties.center;
				}
				options.center = point.toProprietary(this.api);
			}
			
			if (properties.hasOwnProperty('zoom') && null !== properties.zoom) {
				options.zoom = properties.zoom;
			}
			
			if (properties.hasOwnProperty('map_type') && null !== properties.map_type) {
				for (var i=0; i<this.defaultBaseMaps.length; i++) {
					if (this.defaultBaseMaps[i].mxnType === properties.map_type) {
						options.mapTypeId = this.defaultBaseMaps[i].providerType;
						break;
					}
				}
			}
			
			if (properties.hasOwnProperty('dragging')) {
				options.draggable = properties.dragging;
			}
			
			if (properties.hasOwnProperty('scroll_wheel')) {
				options.scrollwheel = properties.scroll_wheel;
			}
			
			if (properties.hasOwnProperty('double_click')) {
				options.disableDoubleClickZoom = !properties.double_click;
			}
		}
		
		var map = new google.maps.Map(element, options);
		
		var fireOnNextIdle = [];
		
		google.maps.event.addListener(map, 'idle', function() {
			var fireListCount = fireOnNextIdle.length;
			if (fireListCount > 0) {
				var fireList = fireOnNextIdle.splice(0, fireListCount);
				var handler;
				while((handler = fireList.shift())){
					handler();
				}
			}
		});
		
		// deal with click
		google.maps.event.addListener(map, 'click', function(location){
			me.click.fire({'location': 
				new mxn.LatLonPoint(location.latLng.lat(),location.latLng.lng())
			});
		});
		
		// deal with zoom change
		google.maps.event.addListener(map, 'zoom_changed', function(){
			// zoom_changed fires before the zooming has finished so we 
			// wait for the next idle event before firing our changezoom
			// so that method calls report the correct values
			fireOnNextIdle.push(function() {
				me.changeZoom.fire();
			});
		});
		
		// deal with map movement
		var is_dragging = false;
		google.maps.event.addListener(map, 'dragstart', function() {
			is_dragging = true;
		});
		
		google.maps.event.addListener(map, 'dragend', function(){
			me.moveendHandler(me);
			me.endPan.fire();
			is_dragging = false;
		});
		
		google.maps.event.addListener(map, 'center_changed', function() {
			if (!is_dragging) {
				fireOnNextIdle.push(function() {
					me.endPan.fire();
				});
			}
		});
		
		// deal with initial tile loading
		var loadListener = google.maps.event.addListener(map, 'tilesloaded', function(){
			me.load.fire();
			google.maps.event.removeListener( loadListener );
			/*
			if (!is_dragging) {
				fireOnNextIdle.push(function() {
					me.endPan.fire();
				});
			}
			*/
		});
		
		this.maps[api] = map;
		this.loaded[api] = true;
	},
	
	getVersion: function() {
		return google.maps.version;
	},
	
	applyOptions: function(){
		var map = this.maps[this.api];
		var myOptions = [];
		if (this.options.enableDragging) {
			myOptions.draggable = true;
		} 
		else{
			myOptions.draggable = false;
		}
		if (this.options.enableScrollWheelZoom){
			myOptions.scrollwheel = true;
		} 
		else{
			myOptions.scrollwheel = false;
		}
		if(this.options.disableDoubleClickZoom){
			myOptions.disableDoubleClickZoom = true;
		}
		else{
			myOptions.disableDoubleClickZoom = false;
		}
		map.setOptions(myOptions);
	},

	resizeTo: function(width, height){
		this.currentElement.style.width = width;
		this.currentElement.style.height = height;
		var map = this.maps[this.api];
		google.maps.event.trigger(map,'resize');
  	},

	addControls: function( args ) {
		/* args = { 
		 *     pan:      true,
		 *     zoom:     'large' || 'small',
		 *     overview: true,
		 *     scale:    true,
		 *     map_type: true,
		 *     streetview : true,
		 *     view45degree : true
		 * }
		 */

		var map = this.maps[this.api];
		var options = {};

		// Google has a combined zoom and pan control.

		if ('pan' in args && args.pan) {
			options = {
				panControl: true
			};
			map.setOptions(options);
			this.controls.pan = true;
			
		}
		else if (!('pan' in args) || ('pan' in args && !args.pan)) {
			options = {
				panControl: false
			};
			map.setOptions(options);
			this.controls.pan = false;
		}
		
		if ('zoom' in args) {
			if (args.zoom == 'small') {
				this.addSmallControls();
			}
			
			else if (args.zoom == 'large') {
				this.addLargeControls();
			}
		}
		else {
			options = {
				zoomControl: false
			};
			map.setOptions(options);
			this.controls.zoom = false;
		}

		if ('scale' in args && args.scale){
			options = {
				scaleControl: true,
				scaleControlOptions: {
					style:google.maps.ScaleControlStyle.DEFAULT
				}				
			};
			map.setOptions(options);
			this.controls.scale = true;
		}
		else {
			options = {
				scaleControl: false
			};
			map.setOptions(options);
			this.controls.scale = false;
		}

		if ('map_type' in args && args.map_type){
			this.addMapTypeControls();
		}
		else {
			options = {
				mapTypeControl : false
			};
			map.setOptions(options);
			this.controls.map_type = false;
		}
		
		if ('overview' in args) {
			options = {
				overviewMapControl: true,
				overviewMapControlOptions: {
					opened: true
				}
			};
			map.setOptions(options);
			this.controls.overview = true;
		}
		else {
			options = {
				overviewMapControl: false
			};
			map.setOptions(options);
			this.controls.overview = false;
		}
		
		if ('streetview' in args) {
			options = {
				streetViewControl: true,
				streetViewControlOptions: {
				}
			};
			map.setOptions(options);
			this.controls.streetview = true;
		}else{
			options = {
				streetViewControl: false
			};
			map.setOptions(options);
			this.controls.streetview = false;
		}
		
		if ('view45degree' in args) {
			options = {
				tilt: 45
			};
			map.setOptions(options);
			this.controls.view45degree = true;
		}else{
			options = {
				tilt: 0
			};
			map.setOptions(options);
			this.controls.view45degree = false;
		}
	},

	addSmallControls: function() {
		var map = this.maps[this.api];
		var options = {
			zoomControl: true,
			zoomControlOptions: {
				style: google.maps.ZoomControlStyle.SMALL
			}
		};
		map.setOptions(options);
		this.controls.zoom = 'small';
	},

	addLargeControls: function() {
		var map = this.maps[this.api];
		var options = {
			panControl: true,
			zoomControl: true,
			zoomControlOptions: {
				style:google.maps.ZoomControlStyle.LARGE
			}
		};
		map.setOptions(options);
		this.controls.pan = true;
		this.controls.zoom = 'large';
	},

	addMapTypeControls: function() {
		var map = this.maps[this.api];
		var options = {
			mapTypeControl: true,
			mapTypeControlOptions: {
				style: google.maps.MapTypeControlStyle.DEFAULT
			}
		};
		map.setOptions(options);
		this.controls.map_type = true;
	},

	setCenterAndZoom: function(point, zoom) { 
		var map = this.maps[this.api];
		var pt = point.toProprietary(this.api);
		map.setCenter(pt);
		map.setZoom(zoom);
	},
	
	addMarker: function(marker, old) {
		//toProprietary add marker to the map directly
		return marker.toProprietary(this.api);
	},
	
	removeMarker: function(marker) {
		if (marker.proprietary_marker != null) {
			if(marker.googleLabel != null){
				marker.googleLabel.onRemove();
				marker.googleLabel = null;
			}
			marker.proprietary_marker.setMap(null);
			marker.proprietary_marker = null;
		}
	},
	
	declutterMarkers: function(opts) {
		throw new Error('Mapstraction.declutterMarkers is not currently supported by provider ' + this.api);
	},
	
	changeMapStyle: function(styleArray) {
		var map = this.maps[this.api];
		map.setOptions({styles: styleArray});
	},
	
	addPolyline: function(polyline, old) {
		var map = this.maps[this.api];
		var propPolyline = polyline.toProprietary(this.api);
		propPolyline.setMap(map);
		return propPolyline;
	},

	removePolyline: function(polyline) {
		polyline.proprietary_polyline.setMap(null);
	},
	
	addRadar: function(radar, old) {
		var map = this.maps[this.api];
		var propRadar = radar.toProprietary(this.api);
		propRadar.setMap(map);
		return propRadar;
	},
	
	removeRadar: function(radar) {
		radar.proprietary_radar.setMap(null);
	},
	
	getCenter: function() {
		var map = this.maps[this.api];
		var pt = map.getCenter();
		return new mxn.LatLonPoint(pt.lat(),pt.lng());
	},

	setCenter: function(point, options) {
		var map = this.maps[this.api];
		var pt = point.toProprietary(this.api);
		if (options && options.pan) { 
			map.panTo(pt);
		}
		else { 
			map.setCenter(pt);
		}
	},

	setZoom: function(zoom) {
		var map = this.maps[this.api];
		map.setZoom(zoom);
	},
	
	getZoom: function() {
		var map = this.maps[this.api];
		return map.getZoom();
	},

	getZoomLevelForBoundingBox: function( bbox ) {
		var map = this.maps[this.api];
		var sw = bbox.getSouthWest().toProprietary(this.api);
		var ne = bbox.getNorthEast().toProprietary(this.api);
		var gLatLngBounds = new google.maps.LatLngBounds(sw, ne);
		map.fitBounds(gLatLngBounds);
		return map.getZoom();
		
		// TODO - see http://stackoverflow.com/questions/6048975/google-maps-v3-how-to-calculate-the-zoom-level-for-a-given-bounds
	},

	setMapType: function(mapType) {
		var map = this.maps[this.api];
		var i;
		
		for (i=0; i<this.defaultBaseMaps.length; i++) {
			if (this.defaultBaseMaps[i].mxnType === mapType) {
				map.setMapTypeId(this.defaultBaseMaps[i].providerType);
				return;
			}
		}
		
		for (i=0; i<this.customBaseMaps.length; i++) {
			if (this.customBaseMaps[i].name === mapType) {
				map.setMapTypeId(this.customBaseMaps[i].label);
				return;
			}
		}
		
		throw new Error(this.api + ': unable to find definition for map type ' + mapType);
	},

	getMapType: function() {
		var map = this.maps[this.api];
		var mapType = map.getMapTypeId();
		var i;
		
		for (i=0; i<this.defaultBaseMaps.length; i++) {
			if (this.defaultBaseMaps[i].providerType === mapType) {
				return this.defaultBaseMaps[i].mxnType;
			}
		}
		for (i=0; i<this.customBaseMaps.length; i++) {
			if (this.customBaseMaps[i].label === mapType) {
				return this.customBaseMaps[i].name;
			}
		}
		
		return mxn.Mapstraction.UKNOWN;
	},

	getBounds: function () {
		var map = this.maps[this.api];
		var gLatLngBounds = map.getBounds();
		if (!gLatLngBounds) {
			throw 'Mapstraction.getBounds; bounds not available, map must be initialized';
		}
		var sw = gLatLngBounds.getSouthWest();
		var ne = gLatLngBounds.getNorthEast();
		return new mxn.BoundingBox(sw.lat(), sw.lng(), ne.lat(), ne.lng());
	},

	setBounds: function(bounds){
		var map = this.maps[this.api];
		var sw = bounds.getSouthWest().toProprietary(this.api);
		var ne = bounds.getNorthEast().toProprietary(this.api);
		var gLatLngBounds = new google.maps.LatLngBounds(sw, ne);
		map.fitBounds(gLatLngBounds);
	},

	addImageOverlay: function(id, src, opacity, west, south, east, north, oContext) {
		var map = this.maps[this.api];
		
		var imageBounds = new google.maps.LatLngBounds(
			new google.maps.LatLng(south,west),
			new google.maps.LatLng(north,east));
		
		var groundOverlay = new google.maps.GroundOverlay(src, imageBounds);
		groundOverlay.setMap(map);
	},

	setImagePosition: function(id, oContext) {
		throw new Error('Mapstraction.setImagePosition is not currently supported by provider ' + this.api);
	},
	
	addOverlay: function(url, autoCenterAndZoom) {
		var map = this.maps[this.api];

		var opt = {preserveViewport: (!autoCenterAndZoom)};
		var layer = new google.maps.KmlLayer(url, opt);
		layer.setMap(map);
	},
	
	addTileMap: function(tileMap) {
		var map = this.maps[this.api];
		var prop_tilemap = tileMap.toProprietary(this.api);
		
		if (tileMap.properties.type === mxn.Mapstraction.TileType.BASE) {
			map.mapTypes.set(tileMap.properties.options.label, prop_tilemap);
		}
		
		return prop_tilemap;
	},
	
	getPixelRatio: function() {
		throw new Error('Mapstraction.getPixelRatio is not currently supported by provider ' + this.api);
	},
	
	mousePosition: function(element) {
		var map = this.maps[this.api];
		var locDisp = document.getElementById(element);
		if (locDisp !== null) {
			google.maps.event.addListener(map, 'mousemove', function (point) {
				var loc = point.latLng.lat().toFixed(4) + ' / ' + point.latLng.lng().toFixed(4);
				locDisp.innerHTML = loc;
			});
			locDisp.innerHTML = '0.0000 / 0.0000';
		}
	},
	
	mouseBearing: function(element, centerPoint) {
		var map = this.maps[this.api];
		var locDisp = document.getElementById(element);
		if (locDisp !== null) {
			google.maps.event.addListener(map, 'mousemove', function (point) {
				var mousePoint = new mxn.LatLonPoint(point.latLng.lat(), point.latLng.lng());
				var bearingOrientation = KolorMap.util.bearing(centerPoint, mousePoint).toFixed(4);
				locDisp.innerHTML = bearingOrientation;
			});
			locDisp.innerHTML = '0.0000';
		}
	}
},

MapType: {
	toProprietary: function(type) {
		switch(type) {
			case mxn.Mapstraction.ROAD:
				return google.maps.MapTypeId.ROADMAP;
			case mxn.Mapstraction.SATELLITE:
				return google.maps.MapTypeId.SATELLITE;
			case mxn.Mapstraction.HYBRID:
				return google.maps.MapTypeId.HYBRID;
			case mxn.Mapstraction.PHYSICAL:
				return google.maps.MapTypeId.TERRAIN;
			default:
				return google.maps.MapTypeId.ROADMAP;
		}
	},
	
	fromProprietary: function(type) {
		switch(type) {
			case google.maps.MapTypeId.ROADMAP:
				return mxn.Mapstraction.ROAD;
			case google.maps.MapTypeId.SATELLITE:
				return mxn.Mapstraction.SATELLITE;
			case google.maps.MapTypeId.HYBRID:
				return mxn.Mapstraction.HYBRID;
			case google.maps.MapTypeId.TERRAIN:
				return mxn.Mapstraction.PHYSICAL;
			default:
				return mxn.Mapstraction.ROAD;
		}
	}
},

LatLonPoint: {
	
	toProprietary: function() {
		return new google.maps.LatLng(this.lat, this.lon);
	},

	fromProprietary: function(googlePoint) {
		this.lat = googlePoint.lat();
		this.lon = googlePoint.lng();
		this.lng = this.lon;
	}
	
},

Marker: {
	
	toProprietary: function() {
		var options = {};
		
		var ax = 0;  // anchor x 
		var ay = 0;  // anchor y

		if (this.iconAnchor) {
			ax = this.iconAnchor[0];
			ay = this.iconAnchor[1];
		}
		var gAnchorPoint = new google.maps.Point(ax,ay);
		
		if (this.htmlContent) {
			//Check that RichMarker has been loaded
			if (typeof RichMarker === 'undefined') {
				throw new Error(this.api + ' htmlContent support in markers requires RichMarker.js to be loaded, but it was not not found.');
			}
			
			options.content = this.htmlContent;
			options.flat = true; //set the marker to flat to avoid an auto shadow
		}
		
		if (this.iconUrl) {
			if (this.iconSize) {
 				options.icon = new google.maps.MarkerImage(
					this.iconUrl,
					new google.maps.Size(this.iconSize[0], this.iconSize[1]),
					new google.maps.Point(0, 0),
					gAnchorPoint,
					new google.maps.Size(this.iconSize[0], this.iconSize[1])
				);
			}else{
				options.icon = new google.maps.MarkerImage(
					this.iconUrl,
					new google.maps.Point(0, 0),
					gAnchorPoint
				);
			}

			// do we have a Shadow icon
			if (this.iconShadowUrl) {
				if (this.iconShadowSize) {
					var x = this.iconShadowSize[0];
					var y = this.iconShadowSize[1];
					options.shadow = new google.maps.MarkerImage(
						this.iconShadowUrl,
						new google.maps.Size(x,y),
						new google.maps.Point(0,0),
						gAnchorPoint 
					);
				}
				else {
					options.shadow = new google.maps.MarkerImage(this.iconShadowUrl);
				}
			}
		}
		if (this.draggable) {
			options.draggable = this.draggable;
		}
		if(this.zIndex){
			options.zIndex = this.zIndex;
		}
		if(this.tooltipText){
			//remove all BR tags
			this.tooltipText = this.tooltipText.replace(/(<|&lt;)br\s*\/*(>|&gt;)/g,' ');
			options.title =  this.tooltipText;
		}
		
		if (this.imageMap) {
			options.shape = {
				coord: this.imageMap,
				type: 'poly'
			};
		}
		
		options.position = this.location.toProprietary(this.api);
		//add to map
		options.map = this.map;
		
		var marker = this.htmlContent ? new RichMarker(options) : new google.maps.Marker(options);
		marker.set('id', this.getAttribute('id')); // add marker id
		
		if (this.labelText) {
			this.googleLabel = new GoogleLabel({
				map: this.map
			});
			this.googleLabel.bindTo('position', marker);
			//this.googleLabel.bindTo('text', marker, 'position');
			this.googleLabel.bindTo('visible', marker);
			//this.googleLabel.bindTo('clickable', marker);
			//this.googleLabel.bindTo('zIndex', marker);
			this.googleLabel.set('text', this.labelText);
			if(this.zIndex){
				this.googleLabel.set('zIndex', this.zIndex);
			}
			if (this.iconAnchor) {
				this.googleLabel.set('offsetY', this.iconAnchor[1]);
			}
		}
		
		if (this.infoBubble) {
			var event_action = "click";
			if (this.hover) {
				event_action = "mouseover";
				google.maps.event.addListener(marker, "mouseout", function() {
					marker.mapstraction_marker.closeBubble();
				});
			}
			google.maps.event.addListener(marker, event_action, function() {
				if(marker.mapstraction_marker.hasOwnProperty('proprietary_infowindow') && marker.mapstraction_marker.proprietary_infowindow != null){
					marker.mapstraction_marker.closeBubble();
				}else{
					marker.mapstraction_marker.openBubble();
				}
			});
		}

		if (this.hoverIconUrl) {
			var gSize = new google.maps.Size(this.iconSize[0], this.iconSize[1]);
			var zerozero = new google.maps.Point(0,0);
 			var hIcon = new google.maps.MarkerImage(
				this.hoverIconUrl,
				gSize,
				zerozero,
				gAnchorPoint
			);
 			var Icon = new google.maps.MarkerImage(
				this.iconUrl,
				gSize,
				zerozero,
				gAnchorPoint
			);
			google.maps.event.addListener(
				marker, 
				"mouseover", 
				function(){ 
					marker.setIcon(hIcon); 
				}
			);
			google.maps.event.addListener(
				marker, 
				"mouseout", 
				function(){ marker.setIcon(Icon); }
			);
		}

		google.maps.event.addListener(marker, 'click', function() {
			marker.mapstraction_marker.click.fire();
		});
		
		//draggable
		if(this.draggable){
			
			google.maps.event.addListener(marker, 'drag', function(event) {
				//closeBubble if open
				marker.mapstraction_marker.closeBubble();
				
				//get the radar linked to marker
				var currentMarkerId = marker.mapstraction_marker.getAttribute('id');
				var markerRadar = null;
				var radarsLength = marker.mapstraction_marker.mapstraction.radars.length;
				for(var i = 0; i < radarsLength; i++){
					if(marker.mapstraction_marker.mapstraction.radars[i].getAttribute('id') == currentMarkerId){
						markerRadar = marker.mapstraction_marker.mapstraction.radars[i];
						break;
					}
				}
				
				//TODO stopAnimation
				
				if (markerRadar != null) {
					var array = markerRadar.proprietary_radar.getPath();
					
					var tempPathArray = [];
					
					var lat = event.latLng.lat();
				    var lng = event.latLng.lng();
				    
				    var radarPivotPt = array.getAt(0);
				    
				    var latDiff = radarPivotPt.lat()-lat;
				    var lngDiff = radarPivotPt.lng()-lng;
					
					for(i = 0; i < array.length; i++){
						pLat = array.getAt(i).lat();
				        pLng = array.getAt(i).lng();
				        tempPathArray.push(new google.maps.LatLng(pLat-latDiff,pLng-lngDiff));
					}
					
					//move radar
					markerRadar.proprietary_radar.setPath(tempPathArray);
					//update pivot point
					markerRadar.center = new mxn.LatLonPoint(event.latLng.lat(), event.latLng.lng());
				}
			});
			
			google.maps.event.addListener(marker, 'dragend', function(event) {
				
				var dragLoc = new google.maps.LatLng(event.latLng.lat(), event.latLng.lng());
				marker.setPosition(dragLoc);
				
				marker.mapstraction_marker.update();
				
				var dragEndPos = new mxn.LatLonPoint();
				dragEndPos.fromProprietary('googlev3', dragLoc);
				marker.mapstraction_marker.dragend.fire({'location': dragEndPos });
			});
			
			//right-click events
			google.maps.event.addListener(marker, 'rightclick', function(event) {
				var rightClickPagePos = {pageX: event.pixel.x, pageY: event.pixel.y};
				var rightClickLocProp = new google.maps.LatLng(event.latLng.lat(), event.latLng.lng());
				var rightClickLoc = new mxn.LatLonPoint();
				rightClickLoc.fromProprietary('googlev3', rightClickLocProp);
				
				marker.mapstraction_marker.rightclick.fire({'location': rightClickLoc, 'pageXY': rightClickPagePos });
			});
		}
		
		return marker;
	},
	
	startMarkerAnimation: function(markerId) {
		if(this.proprietary_marker.get('id') == markerId){
			//bounce
			this.proprietary_marker.setAnimation(google.maps.Animation.BOUNCE);
			//other kind of animations request custom :
			//http://stackoverflow.com/questions/18798520/how-to-add-custom-animation-on-google-map-v3-marker-when-i-drop-each-marker-one
			//http://gmaps-samples-v3.googlecode.com/svn/trunk/overlayview/custommarker.html
			//http://aaronmiler.com/blog/google-maps-v3-custom-html-map-marker/
		}
	},
	
	stopMarkerAnimation: function(markerId) {
		if(this.proprietary_marker.get('id') == markerId){
			//bounce
			if (this.proprietary_marker.getAnimation() != null) {
				this.proprietary_marker.setAnimation(null);
			}
		}
	},
	
	openBubble: function() {
		var infowindow, marker = this;
		if (!this.hasOwnProperty('proprietary_infowindow') || this.proprietary_infowindow === null) {
			infowindow = new google.maps.InfoWindow({
				content: '<div>'+this.infoBubble+'</div>',
				disableAutoPan: true
			});
			google.maps.event.addListener(infowindow, 'closeclick', function(closedWindow) {
				marker.closeBubble();
				marker.closeInfoBubble.fire( { 'marker': this } );
			});
		}
		else {
			infowindow = this.proprietary_infowindow;
			//force position update on existing infowindow
			//infowindow.setPosition(this.proprietary_marker.location);
		}
		
		//update infowindow offset if not set
		/*
		if (!this.proprietary_marker.anchorPoint && this.iconAnchor) {
			var options = {};
			ax = 0;
			ay = -this.iconAnchor[1];
			options.pixelOffset = new google.maps.Size(ax,ay);
			infowindow.setOptions(options);
		}
		*/
		this.openInfoBubble.fire( { 'marker': this } );
		infowindow.open(this.map, this.proprietary_marker);
		this.proprietary_infowindow = infowindow; // Save so we can close it later
	},
	
	closeBubble: function() {
		if (this.hasOwnProperty('proprietary_infowindow') && this.proprietary_infowindow !== null) {
			this.proprietary_infowindow.close();
			this.proprietary_infowindow = null;
			this.closeInfoBubble.fire( { 'marker': this } );
		}
	},

	hide: function() {
		this.proprietary_marker.setOptions( { visible: false } );
	},

	show: function() {
		this.proprietary_marker.setOptions( { visible: true } );
	},

	update: function() {
		var point = new mxn.LatLonPoint();
		point.fromProprietary(this.api, this.proprietary_marker.getPosition());
		this.location = point;
	}
},

Polyline: {

	toProprietary: function() {
		var coords = [];
		
		for (var i = 0, length = this.points.length; i < length; i++) {
			coords.push(this.points[i].toProprietary(this.api));
		}
		
		var polyOptions = {
			path: coords,
			strokeColor: this.color,
			strokeOpacity: this.opacity,
			strokeWeight: this.width
		};
		
		if (this.closed) {
			if (!(this.points[0].equals(this.points[this.points.length - 1]))) {
				coords.push(coords[0]);
			}
		}
		else if (this.points[0].equals(this.points[this.points.length - 1])) {
			this.closed = true;
		}
		
		if (this.closed) {
			polyOptions.fillColor = this.fillColor;
			polyOptions.fillOpacity = this.fillOpacity;
			
			this.proprietary_polyline = new google.maps.Polygon(polyOptions);
		}
		else {
			this.proprietary_polyline = new google.maps.Polyline(polyOptions);
		}
		
		return this.proprietary_polyline;
	},
	
	show: function() {
		this.proprietary_polyline.setVisible(true);
	},

	hide: function() {
		this.proprietary_polyline.setVisible(false);
	}
},

TileMap: {
	addToMapTypeControl: function() {
		if (this.prop_tilemap === null) {
			throw new Error(this.api + ': A TileMap must be added to the map before calling addToMapTypeControl()');
		}
		
		// Google v3 only supports adding/removing Base Map type tile overlays to the map type
		// control. If this is an Overlay Map, just return with no action; it seems excessive
		// to throw an exception for this to my mind.

		if (this.properties.type === mxn.Mapstraction.TileType.BASE) {
			var tileCache = this.mxn.customBaseMaps;

			if (!tileCache[this.index].inControl) {
				tileCache[this.index].inControl = true;
				
				var map_ids = [
					google.maps.MapTypeId.ROADMAP,
					google.maps.MapTypeId.HYBRID,
					google.maps.MapTypeId.SATELLITE,
					google.maps.MapTypeId.TERRAIN
				];

				for (var id in tileCache) {
					if (tileCache[id].inControl) {
						map_ids.push(tileCache[id].label);
					}
				}
				
				this.map.setOptions({
					mapTypeControlOptions: {
						mapTypeIds: map_ids
					}
				});
				
				this.tileMapAddedToMapTypeControl.fire({
					'tileMap': this
				});
			}
		}
	},

	hide: function() {
		if (this.prop_tilemap === null) {
			throw new Error(this.api + ': A TileMap must be added to the map before calling hide()');
		}

		// For Google v3 it doesn't make sense to show/hide a Base Map type tile overlay
		
		if (this.properties.type === mxn.Mapstraction.TileType.OVERLAY) {
			var tileCache = this.mxn.overlayMaps;
			
			if (tileCache[this.index].visible) {
				this.map.overlayMapTypes.setAt(this.index, null);
				tileCache[this.index].visible = false;

				this.tileMapHidden.fire({
					'tileMap': this
				});
			}
		}
	},
	
	removeFromMapTypeControl: function() {
		if (this.prop_tilemap === null) {
			throw new Error(this.api + ': A TileMap must be added to the map before calling removeFromMapTypeControl()');
		}
		
		// Google v3 only supports adding/removing Base Map type tile overlays to the map type
		// control. If this is an Overlay Map, just return with no action; it seems excessive
		// to throw an exception for this to my mind.
		
		if (this.properties.type === mxn.Mapstraction.TileType.BASE) {
			var tileCache = this.mxn.customBaseMaps;
			
			if (tileCache[this.index].inControl) {
				tileCache[this.index].inControl = false;
				
				var map_ids = [
					google.maps.MapTypeId.ROADMAP,
					google.maps.MapTypeId.HYBRID,
					google.maps.MapTypeId.SATELLITE,
					google.maps.MapTypeId.TERRAIN
				];
				
				for (var id in tileCache) {
					if (tileCache[id].inControl) {
						map_ids.push(tileCache[id].label);
					}
				}
				
				this.map.setOptions({
					mapTypeControlOptions: {
						mapTypeIds: map_ids
					}
				});

				if (this.map.getMapTypeId() === this.properties.options.label) {
					this.map.setMapTypeId(google.maps.MapTypeId.ROADMAP);
				}
			}
			this.tileMapRemovedFromMapTypeControl.fire({
				'tileMap': this
			});
		}
	},

	show: function() {
		if (this.prop_tilemap === null) {
			throw new Error(this.api + ': A TileMap must be added to the map before calling show()');
		}

		// For Google v3 it doesn't make sense to show/hide a Base Map type tile overlay
		if (this.properties.type === mxn.Mapstraction.TileType.OVERLAY) {
			var tileCache = this.mxn.overlayMaps;
			
			if (!tileCache[this.index].visible) {
				this.map.overlayMapTypes.setAt(this.index, this.prop_tilemap);
				tileCache[this.index].visible = true;
				
				this.tileMapShown.fire({
					'tileMap': this
				});
			}
		}
	},

	toProprietary: function() {
		var self = this;
		var tile_options = {
			getTileUrl: function (coord, zoom) {
				var url = mxn.util.sanitizeTileURL(self.properties.url);
				if (typeof self.properties.options.subdomains !== 'undefined') {
					url = mxn.util.getSubdomainTileURL(url, self.properties.options.subdomains);
				}
				var x = coord.x;
				var maxX = Math.pow(2, zoom);
				while (x < 0) {
					x += maxX;
				}
				while (x >= maxX) {
					x -= maxX;
				}
				url = url.replace(/\{Z\}/gi, zoom);
				url = url.replace(/\{X\}/gi, x);
				url = url.replace(/\{Y\}/gi, coord.y);
				return url;
			},
			tileSize: new google.maps.Size(256, 256),
			isPng: true,
			minZoom: self.properties.options.minZoom,
			maxZoom: self.properties.options.maxZoom,
			opacity: self.properties.options.opacity,
			name: self.properties.options.label
		};
		
		return new google.maps.ImageMapType(tile_options);
	}
},

Radar: {
	
	mouseMove: function() {
		
		var map = this.map;
		var centerPoint = this.center;
		var selfRadar = this;
		
		google.maps.event.addListener(map, 'mousemove', function (point) {
			
			var mousePoint = new mxn.LatLonPoint(point.latLng.lat(), point.latLng.lng());
			
			var bearingOrientation = KolorMap.util.bearing(centerPoint, mousePoint);
			
			//add start heading and fov incidence
			bearingOrientation = bearingOrientation + selfRadar.heading - ((90/180) * (180-selfRadar.fov));
			
			//rotate the current radar polygon and update radar object
			selfRadar =	KolorMap.util.rotation(selfRadar, centerPoint, bearingOrientation, selfRadar.mapstraction);
			
		});
		
		this.mouseMoveRadar.fire( { 'radar': this } );
	},
	
	activateClick: function(){
		var selfRadar = this;
		//this.clickable = true;
		this.radarSelected = false;
		google.maps.event.addListener(selfRadar.proprietary_radar, 'click', function() {
			//TODO radarSelected = true;
			selfRadar.click.fire();
		});
	},
	
	toProprietary: function() {
		
		//toProprietary render only the modified polyline part of the radar (Radar.polyline property)
		var points = [];
		for (var i = 0, length = this.polyline.points.length; i < length; i++) {
			points.push(this.polyline.points[i].toProprietary('googlev3'));
		}
		
		var polyOptions = {
			path: points,
			strokeColor: this.polyline.color || '#000000',
			strokeOpacity: this.polyline.opacity || 1.0, 
			strokeWeight: this.polyline.width || 3
		};
		
		if (this.polyline.closed) {
			polyOptions.fillColor = this.polyline.fillColor || '#000000';
			polyOptions.fillOpacity =  this.polyline.fillOpacity || 1.0;
			
			return new google.maps.Polygon(polyOptions);
		}
		else {
			return new google.maps.Polyline(polyOptions);
		}
	},
	
	show: function() {
		this.proprietary_radar.setVisible(true);
	},

	hide: function() {
		this.proprietary_radar.setVisible(false);
	}
	
}
});