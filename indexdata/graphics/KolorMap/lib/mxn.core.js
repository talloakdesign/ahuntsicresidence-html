(function(){

/**
 * @exports mxn.util.$m as $m
 */
var $m = mxn.util.$m;

/**
 * Initialise our provider. This function should only be called 
 * from within Mapstraction code, not exposed as part of the API.
 * @private
 */
var init = function() {
	//Just need to force the centre property to an mxn point if its present and an array.
	if (this.hasOwnProperty('properties') && this.properties !== null && this.properties.center && Object.prototype.toString.call(this.properties.center) === '[object Array]') {
		this.properties.center = new mxn.LatLonPoint(this.properties.center[0], this.properties.center[1]);
	}
	this.invoker.go('init', [this.currentElement, this.api, this.properties]);
	this.applyOptions();
	
	if (this.maps[this.api] === null) {
		throw new Error('Initialisation error; ' + this.api + ' has not created a map object');
	}
	
	for (var i=0; i<this.defaultBaseMaps.length; i++) {
		if (this.defaultBaseMaps[i].mxnType === null) {
			throw new Error('Initialisation error; ' + this.api + ' has an empty/invalid Mapstraction default base map type');
		}
		if (this.defaultBaseMaps[i].providerType === null) {
			var mxnType;
			switch (this.defaultBaseMaps[i].mxnType) {
				case mxn.Mapstraction.ROAD:
					mxnType = 'mxn.Mapstraction.ROAD';
					break;
				case mxn.Mapstraction.SATELLITE:
					mxnType = 'mxn.Mapstraction.SATELLITE';
					break;
				case mxn.Mapstraction.HYBRID:
					mxnType = 'mxn.Mapstraction.HYBRID';
					break;
				case mxn.Mapstraction.PHYSICAL:
					mxnType = 'mxn.Mapstraction.PHYSICAL';
					break;
				default:
					mxnType = 'UNKNOWN';
					break;
			}
			throw new Error('Initialisation error; ' + this.api + ' has not defined a default base map for ' + mxnType);
		}
	}
};

/**
 * Mapstraction instantiates a map with some API choice into the HTML element given
 * <p>Creates and loads a Mapstraction map into a specified HTML element. The following mapping APIs
 * are supported by Mapstraction:</p>
 * <ul>
 * <li><code>esri</code> - ESRI ArcGIS</li>
 * <li><code>google</code> - Google v2</li>
 * <li><code>googlev3</code> - Google v3</li>
 * <li><code>leaflet</code> - Leaflet</li>
 * <li><code>mapquest</code> - MapQuest</li>
 * <li><code>microsoft</code> - Microsoft Bing v6</li>
 * <li><code>microsoftv7</code> - Microsoft Bing v7/v8</li>
 * <li><code>nokia</code> - Nokia Here</li>
 * <li><code>openlayersv2</code> - OpenLayers</li>
 * <li><code>openmq</code> - MapQuest Open</li>
 * <li><code>openspace</code> - Ordnance Survey OpenSpace</li>
 * <li><code>ovi</code> - Nokia Ovi</li>
 * <li><code>yahoo</code> - <strong><em>Yahoo (obsoleted)</em></strong></li>
 * <li><code>yandex</code> - Yandex</li>
 * <li><code>yandexv2</code> - Yandex v2</li>
 * </ul>
 * <p>The <code>properties</code> object can contain one or more of the following members:</p>
 *
 * <pre>
 * var properties = {
 * 'controls': {
 * 'pan': null, // set to true to add pan control
 * 'zoom': null, // set to 'large' or 'small' to add zoom control
 * 'overview': null, // set to true to add overview control
 * 'scale': null, // set to true to add scale control
 * 'map_type': null // set to true to add map type control
 * },
 * 'center': null, // set to desired map centre, one of mxn.LatLonPoint or [lat, lon]
 * 'zoom': null, // set to desired initial zoom level
 * 'map_type': null // set to one of mxn.Mapstraction.[ROAD|PHYSICAL|HYBRID|SATELLITE]
 * };
 * </pre>
 *
 * @name mxn.Mapstraction
 * @constructor
 * @param {string} element The HTML element to replace with a map.
 * @param {string} api The API ID of the mapping API to use; if omitted, the first loaded provider implementation is used.
 * @param {object} [properties] options properties object to customize the default map controls, centre, zoom level and map type.
 * @exports Mapstraction as mxn.Mapstraction
 */
var Mapstraction = mxn.Mapstraction = function(element, api, properties) {
	if (!api){
		api = mxn.util.getAvailableProviders()[0];
	}
	
	api = mxn.util.translateProvider(api);
	
	if (!properties) {
		properties = null;
	}
	
	/**
	 * The name of the active API.
	 * @name mxn.Mapstraction#api
	 * @type {string}
	 */
	this.api = api;
		
	this.maps = {};
	
	/**
	 * The DOM element containing the map.
	 * @name mxn.Mapstraction#currentElement
	 * @property
	 * @type {DOMElement}
	 */
	this.currentElement = $m(element);
	
	this.eventListeners = [];
	
	/**
	 * The array of all layers that have been added to the map.
	 * @name mxn.Mapstraction#tileLayers
	 * @property
	 * @type {Array}
	 */
	this.tileLayers = [];
	
	/**
	 * Array of the default base maps that Mapstraction supports. This array <em>must</em>
	 * be fully populated by a map provider's implementation as part of that provider's
	 * <code>Mapstraction.init</code> method. Failure to do so will result in an exception
	 * being thrown during the core Mapstraction <code>init</code> method.
	 * @name mxn.Mapstraction#defaultBaseMaps
	 * @property
	 * @type {Array}
	 * @private
	 */
	this.defaultBaseMaps = [{
		mxnType: mxn.Mapstraction.ROAD,
		providerType: null,
		nativeType: true
	},
	{
		mxnType: mxn.Mapstraction.SATELLITE,
		providerType: null,
		nativeType: true
	},
	{
		mxnType: mxn.Mapstraction.HYBRID,
		providerType: null,
		nativeType: true
	},
	{
		mxnType: mxn.Mapstraction.PHYSICAL,
		providerType: null,
		nativeType: true
	}];
	
	/**
	 * Array of all BaseMap layers that have been added to the map.
	 * @name mxn.Mapstraction#baseMaps
	 * @property
	 * @type {Array}
	 */
	this.customBaseMaps = [];
	
	/**
	 * Array of all OverlayMap layers that have been added to the map.
	 * @name mxn.Mapstraction#boverlayMaps
	 * @property
	 * @type {Array}
	 */
	this.overlayMaps = [];
	
	/**
	 * The array of currently loaded <code>mxn.Marker</code> objects.
	 * @name mxn.Mapstraction#markers
	 * @property
	 * @type {Array}
	 */
	this.markers = [];
		
	/**
	 * The array of currently loaded <code>mxn.Polyline</code> objects.
	 * @name mxn.Mapstraction#polylines
	 * @property
	 * @type {Array}
	 */
	this.polylines = [];
	
	/**
	 * The array of currently loaded <code>mxn.Radar</code> objects (with polyines).
	 * @name mxn.Mapstraction#radars
	 * @property
	 * @type {Array}
	 */
	this.radars = [];
	
	this.properties = properties;
	this.images = [];
	this.controls = [];
	this.loaded = {};
	this.onload = {};
    //this.loaded[api] = true; // FIXME does this need to be true? -ajturner
	this.onload[api] = [];
	
	/**
	 * The original element value passed to the constructor.
	 * @name mxn.Mapstraction#element
	 * @property
	 * @type {string|DOMElement}
	 */
	this.element = element;
	
	/**
	 * Options defaults.
	 * @name mxn.Mapstraction#options
	 * @property {Object}
	 */
	this.options = {
		enableScrollWheelZoom: true,
		enableDragging: true,
		disableDoubleClickZoom: false
	};
	
	this.addControlsArgs = {};
	
	// set up our invoker for calling API methods
	this.invoker = new mxn.Invoker(this, 'Mapstraction', function(){ return this.api; });
	
	// Adding our events
	mxn.addEvents(this, [
		
		/**
		 * Map has loaded
		 * @name mxn.Mapstraction#load
		 * @event
		 */
		'load',
		
		/**
		 * Map is clicked {location: mxn.LatLonPoint}
		 * @name mxn.Mapstraction#click
		 * @event
		 */
		'click',
		
		/**
		 * Map is panned
		 * @name mxn.Mapstraction#endPan
		 * @event
		 */
		'endPan',
		
		/**
		 * Zoom is changed
		 * @name mxn.Mapstraction#changeZoom
		 * @event
		 */
		'changeZoom',
		
		/**
		 * Marker is added {marker: Marker}
		 * @name mxn.Mapstraction#markerAdded
		 * @event
		 */
		'markerAdded',
		
		/**
		 * Marker is added {marker: Marker}
		 * @name mxn.Mapstraction#markerAdded
		 * @event
		 */
		'markerUpdated',
		
		/**
		 * Marker is removed {marker: Marker}
		 * @name mxn.Mapstraction#markerRemoved
		 * @event
		 */
		'markerRemoved',
		
		/**
		 * Polyline is added {polyline: Polyline}
		 * @name mxn.Mapstraction#polylineAdded
		 * @event
		 */
		'polylineAdded',
		
		/**
		 * Polyline is removed {polyline: Polyline}
		 * @name mxn.Mapstraction#polylineRemoved
		 * @event
		 */
		'polylineRemoved',
		
		/**
		 * TileMap is added {tileMap: TileMap}
		 * @name mxn.Mapstraction#tileMapAdded
		 * @event
		 */
		'tileMapAdded',
		
		/**
		 * Radar polyline is added {radar: Radar}
		 * @name mxn.Mapstraction#radarAdded
		 * @event
		 */
		'radarAdded',
		
		/**
		 * Radar polyline is removed {radar: Radar}
		 * @name mxn.Mapstraction#radarRemoved
		 * @event
		 */
		'radarRemoved'
	]);
	
	// finally initialize our proper API map
	init.apply(this);
};

mxn.Mapstraction.TileType = Object.freeze({
	'UNKNOWN': 0,
	'BASE': 1,
	'OVERLAY': 2
});

/**
 * Map type constants
 * @const
 * @type {number}
 */
mxn.Mapstraction.UNKNOWN = 0;
mxn.Mapstraction.ROAD = 1;
mxn.Mapstraction.SATELLITE = 2;
mxn.Mapstraction.HYBRID = 3;
mxn.Mapstraction.PHYSICAL = 4;

// methods that have no implementation in mapstraction core
mxn.addProxyMethods(Mapstraction, [
	/**
	 * Returns the version of the active Map provider
	 * @name mxn.Mapstraction#getVersion
	 * @function
	 * return {string} the current, active, Map provider's version
	 */
	'getVersion',
	
	/**
	 * Adds a timer function to change display of map control only after map is loaded
	 * This is a hack for microsoftv7 maps
	 * @name mxn.Mapstraction#addControlsTimer
	 * @function
	 * @param {array} args Which controls to switch on
	 */
	'addControlsTimer',
	'addControlsTimeout',
	
	/**
	 * Adds a large map panning control and zoom buttons to the map
	 * @name mxn.Mapstraction#addLargeControls
	 * @function
	 */
	'addLargeControls',
	
	/**
	 * Adds a map type control to the map (streets, aerial imagery etc)
	 * @name mxn.Mapstraction#addMapTypeControls
	 * @function
	 */
	'addMapTypeControls',
	
	/**
	 * Adds a GeoRSS or KML overlay to the map
	 *  some flavors of GeoRSS and KML are not supported by some of the Map providers
	 * @name mxn.Mapstraction#addOverlay
	 * @function
	 * @param {string} url GeoRSS or KML feed URL
	 * @param {boolean} autoCenterAndZoom Set true to auto center and zoom after the feed is loaded
	 */
	'addOverlay',
	
	/**
	 * Adds a small map panning control and zoom buttons to the map
	 * @name mxn.Mapstraction#addSmallControls
	 * @function
	 */
	'addSmallControls',
	
	/**
	 * Applies the current option settings
	 * @name mxn.Mapstraction#applyOptions
	 * @function
	 */
	'applyOptions',
	
	/**
	 * Gets the BoundingBox of the map
	 * @name mxn.Mapstraction#getBounds
	 * @function
	 * @returns {mxn.BoundingBox} The bounding box for the current map state
	 */
	'getBounds', 
	
	/**
	 * Gets the central point of the map
	 * @name mxn.Mapstraction#getCenter
	 * @function
	 * @returns {mxn.LatLonPoint} The center point of the map
	 */
	'getCenter', 
	
	/**
	 * <p>Gets the current base map type for the map. The type can be one of:</p>
	 * <ul>
	 * <li><code>mxn.Mapstraction.ROAD</code></li>
	 * <li><code>mxn.Mapstraction.SATELLITE</code></li>
	 * <li><code>mxn.Mapstraction.HYBRID</code></li>
	 * <li><code>mxn.Mapstraction.PHYSICAL</code></li>
	 * </ul>
	 * <p>Or the label of a custom base map type, defined via <code>addTileMap</code>
	 * @name mxn.Mapstraction#getMapType
	 * @function
	 * @see mxn.BaseMap
	 * @see mxn.Mapstraction#addTileMap
	 * @returns {number|string} The current base map type.
	 */
	'getMapType', 

	/**
	 * Returns a ratio to turn distance into pixels based on the current projection.
	 * @name mxn.Mapstraction#getPixelRatio
	 * @function
	 * @returns {number} ratio
	 */
	'getPixelRatio',
	
	/**
	 * Returns the zoom level of the map
	 * @name mxn.Mapstraction#getZoom
	 * @function
	 * @returns {number} The zoom level of the map
	 */
	'getZoom',
	
	/**
	 * Returns the best zoom level for bounds given
	 * @name mxn.Mapstraction#getZoomLevelForBoundingBox
	 * @function
	 * @param {mxn.BoundingBox} bbox The bounds to fit
	 * @returns {number} The closest zoom level that contains the bounding box
	 */
	'getZoomLevelForBoundingBox',
	
	/**
	 * Displays the coordinates of the cursor in the HTML element
	 * @name mxn.Mapstraction#mousePosition
	 * @function
	 * @param {string} element ID of the HTML element to display the coordinates in
	 */
	'mousePosition',
	
	/**
	 * Displays the bearing of the cursor in the HTML element
	 * @name mxn.Mapstraction#mouseBearing
	 * @function
	 * @param {String} element ID of the HTML element to display the coordinates in
	 * @param {mxn.LatLonPoint} pivot point for bearing
	 */
	'mouseBearing',
	
	/**
	 * Resize the current map to the specified width and height
	 * (since it is actually on a child div of the mapElement passed
	 * as argument to the Mapstraction constructor, the resizing of this
	 * mapElement may have no effect on the size of the actual map)
	 * @name mxn.Mapstraction#resizeTo
	 * @function
	 * @param {number} width The width the map should be.
	 * @param {number} height The width the map should be.
	 */
	'resizeTo',
	
	/**
	 * Sets the map to the appropriate location and zoom for a given BoundingBox
	 * @name mxn.Mapstraction#setBounds
	 * @function
	 * @param {mxn.BoundingBox} bounds The bounding box you want the map to show
	 */
	'setBounds', 
	
	/**
	 * setCenter sets the central point of the map
	 * @name mxn.Mapstraction#setCenter
	 * @function
	 * @param {mxn.LatLonPoint} point The point at which to center the map
	 * @param {Object} [options] Optional parameters
	 * @param {boolean} options.pan Whether the map should move to the locations using a pan or just jump straight there
	 */
	'setCenter',
	
	/**
	 * Centers the map to some place and zoom level
	 * @name mxn.Mapstraction#setCenterAndZoom
	 * @function
	 * @param {mxn.LatLonPoint} point Where the center of the map should be
	 * @param {number} zoom The zoom level where 0 is all the way out.
	 */
	'setCenterAndZoom',
	
	/**
	 * <p>Sets the new base map type for the map. The type can be one of:</p>
	 * <ul>
	 * <li><code>mxn.Mapstraction.ROAD</code></li>
	 * <li><code>mxn.Mapstraction.SATELLITE</code></li>
	 * <li><code>mxn.Mapstraction.HYBRID</code></li>
	 * <li><code>mxn.Mapstraction.PHYSICAL</code></li>
	 * </ul>
	 * <p>Or the label of a custom base map type, defined via <code>addTileMap</code>
	 * @name mxn.Mapstraction#setMapType
	 * @function
	 * @see mxn.BaseMap
	 * @see mxn.Mapstraction#addTileMap
	 * @param {number|string} mapType The required base map type.
	 */
	'setMapType',
	
	/**
	 * Sets the zoom level for the map.
	 * @name mxn.Mapstraction#setZoom
	 * @function
	 * @param {Number} zoom The (native to the map) level zoom the map to.
	 */
	'setZoom'
]);

/**
 * Initialises the default set of base map types. This method <em>must</em> be called from
 * a provider's <code>Mapstraction.init</code> method.
 * @name mxn.Mapstraction#initBaseMaps
 * @function
 * @private
 */
Mapstraction.prototype.initBaseMaps = function() {
	var options = {
		addControl: true,
		makeCurrent: false
	};
	
	for (var i=0; i<this.defaultBaseMaps.length; i++) {
		if (!this.defaultBaseMaps[i].nativeType) {
			var baseMap = this.addTileMap(this.defaultBaseMaps[i].providerType, options);
		}
	}
};

/**
 * Sets the current options to those specified in oOpts and applies them
 * @param {Object} oOpts Hash of options to set
 */
Mapstraction.prototype.setOptions = function(oOpts){
	mxn.util.merge(this.options, oOpts);
	this.applyOptions();
};

/**
 * Sets an option and applies it.
 * @param {string} sOptName Option name
 * @param vVal Option value
 */
Mapstraction.prototype.setOption = function(sOptName, vVal){
	this.options[sOptName] = vVal;
	this.applyOptions();
};

/**
 * Change the current API on the fly
 * @see mxn.Mapstraction
 * @param {Object} element The DOM element containing the map
 * @param {string} api The API to swap to
 */
Mapstraction.prototype.swap = function(element, api) {
	if (this.api === api) {
		return;
	}
	
	var center = this.getCenter();
	var zoom = this.getZoom();
	
	//hide all radars
	for (var j = 0; j < this.radars.length; j++) {
		this.radars[j].hide();
		//remove radars from map previous api before add in new api
		var invokerOptions = {};
		invokerOptions.overrideApi = true;
		this.invoker.go('removeRadar', [this.radars[j].api, this.radars[j]], invokerOptions);
	}
	
	//hide all markers
	for (var i = 0; i < this.markers.length; i++) {
		//remove marker from map previous api before add in new api
		var invokerOptions = {};
		invokerOptions.overrideApi = true;
		this.invoker.go('removeMarker', [this.markers[i].api, this.markers[i]], invokerOptions);
	}
	
	this.currentElement.style.visibility = 'hidden';
	this.currentElement.style.display = 'none';

	this.currentElement = $m(element);
	this.currentElement.style.visibility = 'visible';
	this.currentElement.style.display = 'block';
	
	this.api = api;
	this.onload[api] = [];
	
	if (!this.maps.hasOwnProperty(this.api)) {
	//if (this.maps[this.api] === undefined) {
		init.apply(this);
		
		for (var j = 0; j < this.polylines.length; j++) {
			this.addPolyline( this.polylines[j], true);
		}
		
		for (var k = 0; k < this.radars.length; k++) {
			this.addRadar( this.radars[k], true);
			//hide all radars
			this.radars[k].hide();
		}
		
		for (var i = 0; i < this.markers.length; i++) {
			/*	v2 : this.updateMarker( this.markers[i], true);
				v1 :
			//close info bubble and remove stored object proprietary_infowindow
			this.markers[i].closeBubble();
			this.markers[i].proprietary_infowindow = null;
			
			//remove marker from map previous api before add in new api
			var invokerOptions = {};
			invokerOptions.overrideApi = true;
			this.invoker.go('removeMarker', [this.markers[i].api, this.markers[i]], invokerOptions);
			*/
			this.addMarker(this.markers[i], true);
		}
		
		this.setCenterAndZoom(center,zoom);
		
		this.addControls(this.addControlsArgs);
	} else {
		//sync the view
		this.setCenterAndZoom(center,zoom);
		
		//TODO synchronize the markers and polylines too
		// (any overlays created after api instantiation are not sync'd)
		
		//update api for radars
		for (var k = 0; k < this.radars.length; k++) {
			this.updateRadar( this.radars[k], true);
			//hide all radars
			this.radars[k].hide();
		}
		
		//update api for markers
		for (var i = 0; i < this.markers.length; i++) {
			this.updateMarker( this.markers[i], true);
		}
		
	}
};

/**
 * Returns the loaded state of a Map Provider
 * @param {string} [api] Optional API to query for. If not specified, returns the state of the originally created API
 */
Mapstraction.prototype.isLoaded = function(api){
	if (api === null) {
		api = this.api;
	}
	return this.loaded[api];
};

/**
 * Set the api call deferment on or off - When it's on, mxn.invoke will queue up provider API calls until
 * runDeferred is called, at which time everything in the queue will be run in the order it was added. 
 * @param {boolean} set deferred to true to turn on deferment
 */
Mapstraction.prototype.setDefer = function(deferred){
	this.loaded[this.api] = !deferred;
};

/**
 * Run any queued provider API calls for the methods defined in the provider's implementation.
 * For example, if defferable in mxn.[provider].core.js is set to {getCenter: true, setCenter: true}
 * then any calls to map.setCenter or map.getCenter will be queued up in this.onload. When the provider's
 * implementation loads the map, it calls this.runDeferred and any queued calls will be run.
 */
Mapstraction.prototype.runDeferred = function(){
	while(this.onload[this.api].length > 0) {  
		this.onload[this.api].shift().apply(this); //run deferred calls
	}
};

/////////////////////////
//
// Event Handling
//
// FIXME need to consolidate some of these handlers...
//
///////////////////////////

// Click handler attached to native API
Mapstraction.prototype.clickHandler = function(lat, lon, me) {
	this.callEventListeners('click', {
		location: new LatLonPoint(lat, lon)
	});
};

// Move and zoom handler attached to native API
Mapstraction.prototype.moveendHandler = function(me) {
	this.callEventListeners('moveend', {});
};

/**
 * Add a listener for an event.
 * @param {string} type Event type to attach listener to
 * @param {Function} func Callback function
 * @param {Object} caller Callback object
 */
Mapstraction.prototype.addEventListener = function() {
	var listener = {};
	listener.event_type = arguments[0];
	listener.callback_function = arguments[1];
	
	// added the calling object so we can retain scope of callback function
	if(arguments.length == 3) {
		listener.back_compat_mode = false;
		listener.callback_object = arguments[2];
		
		// add handler attachment for the callback object
		listener.callback_object[listener.event_type].addHandler(listener.callback_function, listener.callback_object);
	}
	else {
		listener.back_compat_mode = true;
		listener.callback_object = null;
		
		// add handler attachment on the mapstraction object
		this[listener.event_type].addHandler(listener.callback_function, this);
	}
	this.eventListeners.push(listener);
};

/**
 * Call listeners for a particular event.
 * @param {string} sEventType Call listeners of this event type
 * @param {Object} oEventArgs Event args object to pass back to the callback
 */
Mapstraction.prototype.callEventListeners = function(sEventType, oEventArgs) {
	oEventArgs.source = this;
	for(var i = 0; i < this.eventListeners.length; i++) {
		var evLi = this.eventListeners[i];
		if(evLi.event_type == sEventType) {
			// only two cases for this, click and move
			if(evLi.back_compat_mode) {
				if(evLi.event_type == 'click') {
					evLi.callback_function(oEventArgs.location);
				}
				else {
					evLi.callback_function();
				}
			}
			else {
				var scope = evLi.callback_object || this;
				evLi.callback_function.call(scope, oEventArgs);
			}
		}
	}
};


////////////////////
//
// map manipulation
//
/////////////////////


/**
 * <p><code>addControls</code> adds (or removes) controls to/from the map. You specify which controls to add in
 * the object literal that is the only argument.<p>
 * <p>To remove all controls from the map, call <code>addControls</code> with an empty object literal as the
 * argument.<p>
 * <p>Each time <code>addControls</code> is called, those controls present in the <code>args</code> object literal will
 * be added; those that are not specified or as specified as false will be removed.</p>
 * <pre>
 * args = {
 *  pan: true,
 *  zoom: 'large' || 'small',
 *  overview: true,
 *  scale: true,
 *  map_type: true,
 * }
 * </pre>
 * @param {Array} args Which controls to switch on
 */
Mapstraction.prototype.addControls = function( args ) {
	this.addControlsArgs = args;
	this.invoker.go('addControls', arguments);
};

/**
 * Adds a marker pin to the map
 * @param {mxn.Marker} marker The marker to add
 * @param {boolean} old If true, doesn't add this marker to the markers array. Used by the "swap" method
 */
Mapstraction.prototype.addMarker = function(marker, old) {
	marker.mapstraction = this;
	marker.api = this.api;
	marker.location.api = this.api;
	marker.map = this.maps[this.api]; 
	var propMarker = this.invoker.go('addMarker', arguments);
	marker.setChild(propMarker);
	if (!old) {
		this.markers.push(marker);
	}
	this.markerAdded.fire({'marker': marker});
};

/**
 * Update a marker on the map
 * @param {Marker} marker The marker to update
 */
Mapstraction.prototype.updateMarker = function(marker, old) {

	//close info bubble
	marker.closeBubble();
	marker.proprietary_infowindow = null;
	
	//remove marker in old api
	if(!old){
		var invokerOptions = {};
		invokerOptions.overrideApi = true;
		this.invoker.go('removeMarker', [marker.api, marker], invokerOptions);
	}
	
	//modify the marker API
	marker.api = this.api;
	marker.map = this.maps[this.api];
	marker.mapstraction = this;
	
	//add marker in new api
	var propMarker = this.invoker.go('addMarker', arguments);
	marker.setChild(propMarker);
	
	this.markerUpdated.fire({'marker': marker});
};

/**
 * addMarkerWithData will addData to the marker, then add it to the map
 * @param {mxn.Marker} marker The marker to add
 * @param {Object} data A data has to add
 */
Mapstraction.prototype.addMarkerWithData = function(marker, data) {
	marker.addData(data);
	this.addMarker(marker);
};

/**
 * Removes a Marker from the map
 * @param {mxn.Marker} marker The marker to remove
 */
Mapstraction.prototype.removeMarker = function(marker) {	
	var current_marker;
	for(var i = 0; i < this.markers.length; i++){
		current_marker = this.markers[i];
		if(marker == current_marker) {
			marker.closeBubble();
			this.invoker.go('removeMarker', arguments);
			marker.onmap = false;
			this.markers.splice(i, 1);
			this.markerRemoved.fire({'marker': marker});
			break;
		}
	}
};

/**
 * Removes all the Markers currently loaded on a map
 */
Mapstraction.prototype.removeAllMarkers = function() {
	var current_marker;
	while(this.markers.length > 0) {
		current_marker = this.markers.pop();
		this.invoker.go('removeMarker', [current_marker]);
	}
};

/**
 * Declutter the markers on the map, group together overlapping markers.
 * @param {Object} opts Declutter options
 */
Mapstraction.prototype.declutterMarkers = function(opts) {
	if(this.loaded[this.api] === false) {
		var me = this;
		this.onload[this.api].push( function() {
			me.declutterMarkers(opts);
		} );
		return;
	}
	
	throw new Error(this.api + ' not supported by Mapstraction.declutterMarkers');
};

/**
 * Add a polyline to the map
 * @param {mxn.Polyline} polyline The Polyline to add to the map
 * @param {boolean} old If true replaces an existing Polyline
 */
Mapstraction.prototype.addPolyline = function(polyline, old) {
	polyline.api = this.api;
	polyline.map = this.maps[this.api];
	var propPoly = this.invoker.go('addPolyline', arguments);
	polyline.setChild(propPoly);
	if(!old) {
		this.polylines.push(polyline);
	}
	this.polylineAdded.fire({'polyline': polyline});
};

/**
 * addPolylineWithData will addData to the polyline, then add it to the map
 * @param {mxn.Polyline} polyline The polyline to add
 * @param {Object} data A data has to add
 */
Mapstraction.prototype.addPolylineWithData = function(polyline, data) {
	polyline.addData(data);
	this.addPolyline(polyline);
};

// Private remove implementation
var removePolylineImpl = function(polyline) {
	this.invoker.go('removePolyline', arguments);
	polyline.onmap = false;
	this.polylineRemoved.fire({'polyline': polyline});
};

/**
 * Remove the polyline from the map
 * @param {mxn.Polyline} polyline The Polyline to remove from the map
 */
Mapstraction.prototype.removePolyline = function(polyline) {
	var current_polyline;
	for(var i = 0; i < this.polylines.length; i++){
		current_polyline = this.polylines[i];
		if(polyline == current_polyline) {
			this.polylines.splice(i, 1);
			removePolylineImpl.call(this, polyline);
			break;
		}
	}
};

/**
 * Removes all polylines from the map
 */
Mapstraction.prototype.removeAllPolylines = function() {
	var current_polyline;
	while(this.polylines.length > 0) {
		current_polyline = this.polylines.pop();
		removePolylineImpl.call(this, current_polyline);
	}
};

/**
 * Add a radar polyline to the map
 * @param {mxn.Radar} radar The Radar object and polyline to add to the map
 * @param {boolean} old If true replaces an existing Radar
 */
Mapstraction.prototype.addRadar = function(radar, old) {
	radar.api = this.api;
	radar.map = this.maps[this.api];
	radar.mapstraction = this;
	
	var propRadar = this.invoker.go('addRadar', arguments);
	radar.setChild(propRadar);
	if(!old) {
		this.radars.push(radar);
	}
	this.radarAdded.fire({'radar': radar});
};

/**
 * Update a radar polyline on the map
 * @param {mxn.Radar} radar the Radar object and polyline to update
 * @param {boolean} old If true replaces an existing Radar
 */
Mapstraction.prototype.updateRadar = function(radar, old) {
	radar.api = this.api;
	radar.map = this.maps[this.api];
	radar.mapstraction = this;
	radar.polyline.api = this.api;
	radar.polyline.proprietary_polyline = radar.toProprietary(this.api);
	
	//TODO old case
	
	var propRadar = this.invoker.go('addRadar', arguments);
	radar.setChild(propRadar);
};

// Private remove implementation for radar
var removeRadarImpl = function(radar) {
	this.invoker.go('removeRadar', arguments);
	radar.onmap = false;
	this.radarRemoved.fire({'radar': radar});
};

/**
 * Remove the radar polyline from the map
 * @param {mxn.Radar} radar The Radar polyline to remove from the map
 */
Mapstraction.prototype.removeRadar = function(radar) {
	var current_radar;
	for(var i = 0; i < this.radars.length; i++){
		current_radar = this.radars[i];
		
		if(radar == current_radar) {
			this.radars.splice(i, 1);
			removeRadarImpl.call(this, radar);
			break;
		}
	}
};

/**
 * Removes all radars polylines from the map
 */
Mapstraction.prototype.removeAllRadars = function() {
	var current_radar;
	while(this.radars.length > 0) {
		current_radar = this.radars.pop();
		removeRadarImpl.call(this, current_radar);
	}
};

var collectPoints = function(bMarkers, bPolylines, bRadars, predicate) {
	var points = [];
	
	if (bMarkers) {
		for (var i = 0; i < this.markers.length; i++) {
			var mark = this.markers[i];
			if (!predicate || predicate(mark)) {
				points.push(mark.location);
			}
		}
	}
	
	if (bPolylines) {
		for(i = 0; i < this.polylines.length; i++) {
			var poly = this.polylines[i];
			if (!predicate || predicate(poly)) {
				for (var j = 0; j < poly.points.length; j++) {
					points.push(poly.points[j]);
				}
			}
		}
	}
	
	//TODO : bRadars
	
	return points;
};

/**
 * Sets the center and zoom of the map to the smallest bounding box
 * containing all markers and polylines
 */
Mapstraction.prototype.autoCenterAndZoom = function() {
	var points = collectPoints.call(this, true, true);
	
	this.centerAndZoomOnPoints(points);
};

/**
 * centerAndZoomOnPoints sets the center and zoom of the map from an array of points
 *
 * This is useful if you don't want to have to add markers to the map
 */
Mapstraction.prototype.centerAndZoomOnPoints = function(points) {
	var bounds = new BoundingBox(90, 180, -90, -180);

	for (var i = 0, len = points.length; i < len; i++) {
		bounds.extend(points[i]);
	}

	this.setBounds(bounds);
};

/**
 * Sets the center and zoom of the map to the smallest bounding box
 * containing all visible markers and polylines
 * will only include markers and polylines with an attribute of "visible"
 */
Mapstraction.prototype.visibleCenterAndZoom = function() {
	var predicate = function(obj) {
		return obj.getAttribute("visible");
	};
	var points = collectPoints.call(this, true, true, predicate);
	
	this.centerAndZoomOnPoints(points);
};

/**
 * Automatically sets center and zoom level to show all polylines
 * @param {Number} padding Optional number of kilometers to pad around polyline
 */
Mapstraction.prototype.polylineCenterAndZoom = function(padding) {
	padding = padding || 0;
	
	var points = collectPoints.call(this, false, true);
	
	if (padding > 0) {
		var padPoints = [];
		for (var i = 0; i < points.length; i++) {
			var point = points[i];
			
			var kmInOneDegreeLat = point.latConv();
			var kmInOneDegreeLon = point.lonConv();
			
			var latPad = padding / kmInOneDegreeLat;
			var lonPad = padding / kmInOneDegreeLon;

			var ne = new LatLonPoint(point.lat + latPad, point.lon + lonPad);
			var sw = new LatLonPoint(point.lat - latPad, point.lon - lonPad);
			
			padPoints.push(ne, sw);
		}
		points = points.concat(padPoints);
	}
	
	this.centerAndZoomOnPoints(points);
};

/**
 * addImageOverlay layers an georeferenced image over the map
 * @param {id} unique DOM identifier
 * @param {src} url of image
 * @param {opacity} opacity 0-100
 * @param {west} west boundary
 * @param {south} south boundary
 * @param {east} east boundary
 * @param {north} north boundary
 */
Mapstraction.prototype.addImageOverlay = function(id, src, opacity, west, south, east, north) {
	
	var b = document.createElement("img");
	b.style.display = 'block';
	b.setAttribute('id',id);
	b.setAttribute('src',src);
	b.style.position = 'absolute';
	b.style.zIndex = 1;
	b.setAttribute('west',west);
	b.setAttribute('south',south);
	b.setAttribute('east',east);
	b.setAttribute('north',north);
	
	var oContext = {
		imgElm: b
	};
	
	this.invoker.go('addImageOverlay', arguments, { context: oContext });
};

Mapstraction.prototype.setImageOpacity = function(id, opacity) {
	if (opacity < 0) {
		opacity = 0;
	}
	if (opacity >= 100) {
		opacity = 100;
	}
	var c = opacity / 100;
	var d = document.getElementById(id);
	if(typeof(d.style.filter)=='string'){
		d.style.filter='alpha(opacity:'+opacity+')';
	}
	if(typeof(d.style.KHTMLOpacity)=='string'){
		d.style.KHTMLOpacity=c;
	}
	if(typeof(d.style.MozOpacity)=='string'){
		d.style.MozOpacity=c;
	}
	if(typeof(d.style.opacity)=='string'){
		d.style.opacity=c;
	}
};

Mapstraction.prototype.setImagePosition = function(id) {
	var imgElement = document.getElementById(id);
	var oContext = {
		latLng: { 
			top: imgElement.getAttribute('north'),
			left: imgElement.getAttribute('west'),
			bottom: imgElement.getAttribute('south'),
			right: imgElement.getAttribute('east')
		},
		pixels: { top: 0, right: 0, bottom: 0, left: 0 }
	};
	
	this.invoker.go('setImagePosition', arguments, { context: oContext });

	imgElement.style.top = oContext.pixels.top.toString() + 'px';
	imgElement.style.left = oContext.pixels.left.toString() + 'px';
	imgElement.style.width = (oContext.pixels.right - oContext.pixels.left).toString() + 'px';
	imgElement.style.height = (oContext.pixels.bottom - oContext.pixels.top).toString() + 'px';
};

Mapstraction.prototype.addJSON = function(json) {
	var features;
	if (typeof(json) == "string") {
		if (window.JSON && window.JSON.parse) {
			features = window.JSON.parse(json);
		} else {
			features = eval('(' + json + ')');
		}
	} else {
		features = json;
	}
	features = features.features;
	var map = this.maps[this.api];
	var html = "";
	var item;
	var polyline;
	var marker;
	var markers = [];

	if(features.type == "FeatureCollection") {
		this.addJSON(features.features);
	}

	for (var i = 0; i < features.length; i++) {
		item = features[i];
		switch(item.geometry.type) {
			case "Point":
				html = "<strong>" + item.title + "</strong><p>" + item.description + "</p>";
				marker = new Marker(new LatLonPoint(item.geometry.coordinates[1],item.geometry.coordinates[0]));
				markers.push(marker);
				this.addMarkerWithData(marker,{
					infoBubble : html,
					label : item.title,
					date : "new Date(\""+item.date+"\")",
					iconShadow : item.icon_shadow,
					marker : item.id,
					iconShadowSize : item.icon_shadow_size,
					icon : item.icon,
					iconSize : item.icon_size,
					category : item.source_id,
					draggable : false,
					hover : false
				});
				break;
			case "Polygon":
				var points = [];
				for (var j = 0; j < item.geometry.coordinates[0].length; j++) {
					points.push(new LatLonPoint(item.geometry.coordinates[0][j][1], item.geometry.coordinates[0][j][0]));
				}
				polyline = new Polyline(points);
				this.addPolylineWithData(polyline,{
					fillColor : item.poly_color,
					fillOpacity : item.poly_opacity,
					date : "new Date(\""+item.date+"\")",
					category : item.source_id,
					width : item.line_width,
					opacity : item.line_opacity,
					color : item.line_color,
					closed : points[points.length-1].equals(points[0]) //first point = last point in the polygon so its closed
				});
				markers.push(polyline);
				break;
			case "Stylers":
				this.changeMapStyle(item.geometry.stylers); //only for 'googlev3' api; apply styles to the map layer objects
				break;
			default:
		}
	}
	return markers;
};

/**
 * Change the map Layer Styles
 * @param {Array} stylersArray
 */
Mapstraction.prototype.changeMapStyle = function(stylersArray){
	
	//Note : only for 'googlev3' api
	if(this.api == 'googlev3'){
		/**
		 * stylersArray format:
		 * @see https://developers.google.com/maps/documentation/javascript/reference?hl=fr#MapTypeStyleFeatureType
		 * var styleArray = {
		 * 	features : [
		 * 		{
		 * 			type : "Feature",
		 * 			geometry : {
		 * 				type : "Stylers", //key name to apply Styles on map
		 * 				stylers : [
		 * 					{
		 * 						featureType : "road",
		 * 						elementType : "geometry",
		 * 						stylers : [
		 * 							{ "visibility": "on" },
		 * 							{ "color": "#F4B741" }
		 * 						]
		 * 					},
		 * 					{
		 * 						featureType : "water",
		 * 						elementType : "geometry",
		 * 						stylers : [
		 * 							{ visibility: "on" },
		 * 							{ color : "#2e2ebe" }
		 * 						] 
		 * 					}
		 * 				]
		 * 			}
		 * 		}
		 * 	]
		 * };
		 */
		this.invoker.go('changeMapStyle', [stylersArray]);
	}
};

/**
 * Adds and shows a Mapstraction tile map to the map, adding it to the Map Type control,
 * if present.
 * @name mxn.Mapstraction#addTileMap
 * @function
 * @param {mxn.TileMap} tileMap A Mapstraction <code>TileMap</code> object.
 * @param {Object} [options] Object literal that specifies display options for the tile map.
 * @param {Boolean} [options.addControl] Specifies whether the tile map should be added to the Map Type control.
 * @param {Boolean} [options.makeCurrent] Specifies whether the tile map should be set as the current map type.
 */

Mapstraction.prototype.addTileMap = function(tileMap, options) {
	if (typeof tileMap === 'string') {
		tileMap = this.providerToTileMap(tileMap);
	}
	
	tileMap.mxn = this;
	tileMap.api = this.api;
	tileMap.map = this.maps[this.api];
	
	var opts = {
		addControl: false,
		makeCurrent: false
	};
	
	if (options) {
		mxn.util.merge(opts, options);
	}
	
	var tileCache = null;
	switch (tileMap.properties.type) {
		case mxn.Mapstraction.TileType.BASE:
			tileCache = this.customBaseMaps;
			break;
		case mxn.Mapstraction.TileType.OVERLAY:
			tileCache = this.overlayMaps;
			break;
		case mxn.Mapstraction.TileType.UNKNOWN:
			throw new Error('Invalid tile type supplied');
		default:
			throw new Error('Invalid tile type supplied');
	}
	
	for (var i in tileCache) {
		if (tileCache.hasOwnProperty(i)) {
			var tile = tileCache[i];
			if (tile.url === tileMap.url && tile.name === tileMap.properties.name) {
				return tileMap;
			}
		}
	}
	
	if (tileMap.prop_tilemap === null) {
		tileMap.index = tileCache.length || 0;
		tileMap.prop_tilemap = this.invoker.go('addTileMap', [tileMap]);
		
		var entry = {
			name: tileMap.properties.name,
			label: tileMap.properties.options.label,
			url: tileMap.properties.url,
			index: tileMap.index,
			inControl: false,
			visible: false,
			tileMap: tileMap
		};
		
		tileCache.push(entry);
		this.tileMapAdded.fire({
			'tileMap': tileMap
		});
		
		if (opts.addControl && tileMap.properties.type === mxn.Mapstraction.TileType.BASE) {
			tileMap.invoker.go('addToMapTypeControl', arguments);
		}
		if (opts.makeCurrent) {
			if (tileMap.properties.type === mxn.Mapstraction.TileType.BASE) {
				this.invoker.go('setMapType', [tileMap.properties.name]);
			}
			else {
				tileMap.invoker.go('show', arguments);
			}
		}
	}
	
	return tileMap;
};

Mapstraction.prototype.providerToTileMap = function(providerName) {
	var parts = providerName.split('.');
	var valid = true;
	
	if (parts[0] !== 'mxn') {
		valid = false;
	}
	else if (parts[1] !== 'BaseMapProviders') {
		valid = false;
	}
	else if (!mxn.BaseMapProviders.hasOwnProperty(parts[2])) {
		valid = false;
	}
	
	if (!valid) {
		throw new Error('No such tile map provider defined for ' + providerName);
	}

	var tileName = parts[2];
	var variantName = parts[3];
	
	var provider = {
		url: mxn.BaseMapProviders[tileName].url,
		name: providerName,
		type: mxn.Mapstraction.TileType.BASE,
		options: {
			label: mxn.BaseMapProviders[tileName].options.label,
			alt: mxn.BaseMapProviders[tileName].options.alt,
			attribution: null,
			opacity: 1.0,
			minZoom: 1,
			maxZoom: 18,
			subdomains: null
		}
	};
	
	if (mxn.BaseMapProviders[tileName].options) {
		mxn.util.merge(provider.options, mxn.BaseMapProviders[tileName].options);
	}

	if (variantName && 'variants' in mxn.BaseMapProviders[tileName]) {
		if (!(variantName in mxn.BaseMapProviders[tileName].variants)) {
			throw new Error('No such variant (' + variantName + ') defined for tile map ' + tileName);
		}
		
		var variant = mxn.BaseMapProviders[tileName].variants[variantName];
		provider.url = variant.url || provider.url;
		provider.name = variant.name || provider.name;
		mxn.util.merge(provider.options, variant.options);
	}
	
	var attributionReplacer = function(attr) {
		if (attr.indexOf('{attribution.') === -1) {
			return attr;
		}
		return attr.replace(/\{attribution.(\w*)\}/,
			function (match, attributionName) {
				return attributionReplacer(mxn.BaseMapProviders[attributionName].options.attribution);
			}
		);
	};

	provider.options.attribution = attributionReplacer(provider.options.attribution);

	tileMap = new mxn.TileMap(provider);
	return tileMap;
};

Mapstraction.prototype.getDefaultBaseMap = function(type) {
	for (var i=0; i<this.defaultBaseMaps.length; i++) {
		if (type === this.defaultBaseMaps[i].mxnType) {
			return this.defaultBaseMaps[i];
		}
	}
	
	return null;
};

Mapstraction.prototype.getCustomBaseMap = function(name) {
	for (var i=0; i<this.customBaseMaps.length; i++) {
		if (name === this.customBaseMaps[i].name) {
			return this.customBaseMaps[i];
		}
	}
	
	return null;
};

/**
 * addFilter adds a marker filter
 * @param {Object} field Name of attribute to filter on
 * @param {Object} operator Presently only "ge" or "le"
 * @param {Object} value The value to compare against
 */
Mapstraction.prototype.addFilter = function(field, operator, value) {
	if (!this.filters) {
		this.filters = [];
	}
	this.filters.push( [field, operator, value] );
};

/**
 * Remove the specified filter
 * @param {Object} field
 * @param {Object} operator
 * @param {Object} value
 */
Mapstraction.prototype.removeFilter = function(field, operator, value) {
	if (!this.filters) {
		return;
	}
	
	for (var f=0; f<this.filters.length; f++) {
		if (this.filters[f][0] == field &&
			(! operator || (this.filters[f][1] == operator && this.filters[f][2] == value))) {
			this.filters.splice(f,1);
			f--; //array size decreased
		}
	}
};

/**
 * Delete the current filter if present; otherwise add it
 * @param {Object} field
 * @param {Object} operator
 * @param {Object} value
 */
Mapstraction.prototype.toggleFilter = function(field, operator, value) {
	if (!this.filters) {
		this.filters = [];
	}

	var found = false;
	for (var f = 0; f < this.filters.length; f++) {
		if (this.filters[f][0] == field && this.filters[f][1] == operator && this.filters[f][2] == value) {
			this.filters.splice(f,1);
			f--; //array size decreased
			found = true;
		}
	}

	if (! found) {
		this.addFilter(field, operator, value);
	}
};

/**
 * removeAllFilters
 */
Mapstraction.prototype.removeAllFilters = function() {
	this.filters = [];
};

/**
 * doFilter executes all filters added since last call
 * Now supports a callback function for when a marker is shown or hidden
 * @param {Function} showCallback
 * @param {Function} hideCallback
 * @returns {Int} count of visible markers
 */
Mapstraction.prototype.doFilter = function(showCallback, hideCallback) {
	var map = this.maps[this.api];
	var visibleCount = 0;
	var f;
	if (this.filters) {
		switch (this.api) {
			case 'multimap':
				/* TODO polylines aren't filtered in multimap */
				var mmfilters = [];
				for (f=0; f<this.filters.length; f++) {
					mmfilters.push( new MMSearchFilter( this.filters[f][0], this.filters[f][1], this.filters[f][2] ));
				}
				map.setMarkerFilters( mmfilters );
				map.redrawMap();
				break;
			case '  dummy':
				break;
			default:
				var vis;
				for (var m=0; m<this.markers.length; m++) {
					vis = true;
					for (f = 0; f < this.filters.length; f++) {
						if (! this.applyFilter(this.markers[m], this.filters[f])) {
							vis = false;
						}
					}
					if (vis) {
						visibleCount ++;
						if (showCallback){
							showCallback(this.markers[m]);
						}
						else {
							this.markers[m].show();
						}
					} 
					else { 
						if (hideCallback){
							hideCallback(this.markers[m]);
						}
						else {
							this.markers[m].hide();
						}
					}

					this.markers[m].setAttribute("visible", vis);
				}
				break;
		}
	}
	return visibleCount;
};

Mapstraction.prototype.applyFilter = function(o, f) {
	var vis = true;
	switch (f[1]) {
		case 'ge':
			if (o.getAttribute( f[0] ) < f[2]) {
				vis = false;
			}
			break;
		case 'le':
			if (o.getAttribute( f[0] ) > f[2]) {
				vis = false;
			}
			break;
		case 'eq':
			if (o.getAttribute( f[0] ) != f[2]) {
				vis = false;
			}
			break;
		case 'in':
			if ( typeof(o.getAttribute( f[0] )) == 'undefined' ) {
				vis = false;
			} else if (o.getAttribute( f[0] ).indexOf( f[2] ) == -1 ) {
				vis = false;
			}
			break;
	}

	return vis;
};

/**
 * getAttributeExtremes returns the minimum/maximum of "field" from all markers
 * @param {Object} field Name of "field" to query
 * @returns {Array} of minimum/maximum
 */
Mapstraction.prototype.getAttributeExtremes = function(field) {
	var min;
	var max;
	for (var m=0; m<this.markers.length; m++) {
		if (! min || min > this.markers[m].getAttribute(field)) {
			min = this.markers[m].getAttribute(field);
		}
		if (! max || max < this.markers[m].getAttribute(field)) {
			max = this.markers[m].getAttribute(field);
		}
	}
	for (var p=0; m<this.polylines.length; m++) {
		if (! min || min > this.polylines[p].getAttribute(field)) {
			min = this.polylines[p].getAttribute(field);
		}
		if (! max || max < this.polylines[p].getAttribute(field)) {
			max = this.polylines[p].getAttribute(field);
		}
	}

	return [min, max];
};

/**
 * getMap returns the native map object that mapstraction is talking to
 * @returns the native map object mapstraction is using
 */
Mapstraction.prototype.getMap = function() {
	// FIXME in an ideal world this shouldn't exist right?
	return this.maps[this.api];
};

//////////////////////////////
//
// MapType
//
/////////////////////////////

/**
 * Defines a built-in map tile type.
 * @name mxn.MapType
 * @constructor
 * @exports MapType as mxn.MapType
 */

var MapType = mxn.MapType = function() {
	this.invoker = new mxn.Invoker(this, 'MapType');
};

mxn.addProxyMethods(MapType, [
	/**
	 * Convert the current map tile type from a proprietary map type to a Mapstraction map type.
	 * @name mxn.MapType#fromProprietary
	 * @function
	 * @param {string} api The API ID of the proprietary map type.
	 * @param {number} type The proprietary map type.
	 * @return The corresponding Mapstraction map type.
	 */
	'fromProprietary',
	
	/**
	 * Convert a Mapstraction map type to the corresponding proprietary map type.
	 * @name mxn.MapType#toProprietary
	 * @function
	 * @param {string} api The API ID of the proprietary map type.
	 * @param {number} type The Mapstraction map type.
	 * @return The corresponding proprietary map type.
	 */
	'toProprietary'
], true);

//////////////////////////////
//
//   LatLonPoint
//
/////////////////////////////

/**
 * Defines a coordinate point, expressed as a latitude and longitude.
 * @name mxn.LatLonPoint
 * @constructor
 * @param {number} lat The point's latitude
 * @param {number} lon The point's longitude
 * @exports LatLonPoint as mxn.LatLonPoint
 */
var LatLonPoint = mxn.LatLonPoint = function(lat, lon) {
	this.lat = Number(lat); // force to be numeric
	this.lon = Number(lon);
	this.lng = this.lon; // lets be lon/lng agnostic
	
	this.invoker = new mxn.Invoker(this, 'LatLonPoint');
};

mxn.addProxyMethods(LatLonPoint, [ 
	/**
	 * Extract the lat and lon values from a proprietary point.
	 * @name mxn.LatLonPoint#fromProprietary
	 * @function
	 * @param {string} api The API ID of the proprietary point.
	 * @param {Object} point The proprietary point.
	 */
	'fromProprietary',
	
	/**
	 * Converts the current LatLonPoint to a proprietary one for the API specified by <code>api</code>.
	 * @name mxn.LatLonPoint#toProprietary
	 * @function
	 * @param {string} api The API ID of the proprietary point.
	 * @returns A proprietary point.
	 */
	'toProprietary'
], true);

/**
 * Returns a string representation of a point
 * @name mxn.LatLonPoint#toString
 * @param {Number} places Optional number of decimal places to display for the lat and long
 * @returns A string like '51.23, -0.123'
 * @type {string}
 */
LatLonPoint.prototype.toString = function(places) {
	if (typeof places !== 'undefined') {
		return this.lat.toFixed(places) + ', ' + this.lon.toFixed(places);
	}
	else {
		return this.lat + ', ' + this.lon;
	}
};

/**
 * Returns the distance in kilometers between two <code>mxn.LatLonPoint</code> objects.
 * @param {mxn.LatLonPoint} otherPoint The other point to measure the distance from to this one
 * @returns The distance between the points in kilometers
 * @type {number}
 */
LatLonPoint.prototype.distance = function(otherPoint) {
	// Uses Haversine formula from http://www.movable-type.co.uk
	var rads = Math.PI / 180;
	var diffLat = (this.lat-otherPoint.lat) * rads;
	var diffLon = (this.lon-otherPoint.lon) * rads; 
	var a = Math.sin(diffLat / 2) * Math.sin(diffLat / 2) +
		Math.cos(this.lat*rads) * Math.cos(otherPoint.lat*rads) * 
		Math.sin(diffLon/2) * Math.sin(diffLon/2); 
	return 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) * 6371; // Earth's mean radius in km
};

/**
 * Tests if this <code>mxn.LatLonPoint</code> is equal to another point by precisely comparing the latitude and longitude values.
 * @param {mxn.LatLonPoint} otherPoint The other point to test with
 * @returns true or false
 * @type {boolean}
 */
LatLonPoint.prototype.equals = function(otherPoint) {
	return this.lat == otherPoint.lat && this.lon == otherPoint.lon;
};

/**
 * Returns the latitude conversion based on the map's current projection
 * @returns {number} conversion
 */
LatLonPoint.prototype.latConv = function() {
	return this.distance(new LatLonPoint(this.lat + 0.1, this.lon))*10;
};

/**
 * Returns the longitude conversion based on the map's current projection
 * @returns {number} conversion
 */
LatLonPoint.prototype.lonConv = function() {
	return this.distance(new LatLonPoint(this.lat, this.lon + 0.1))*10;
};


//////////////////////////
//
//  BoundingBox
//
//////////////////////////

/**
 * Defines a bounding box, expressed as a rectangle by coordinates for the south west and north east corners.
 * @name mxn.BoundingBox
 * @constructor
 * @param {number} swlat The latitude of the south-west point
 * @param {number} swlon The longitude of the south-west point
 * @param {number} nelat The latitude of the north-east point
 * @param {number} nelon The longitude of the north-east point
 * @exports BoundingBox as mxn.BoundingBox
 */
var BoundingBox = mxn.BoundingBox = function(swlat, swlon, nelat, nelon) {
	//FIXME throw error if box bigger than world
	this.sw = new LatLonPoint(swlat, swlon);
	this.ne = new LatLonPoint(nelat, nelon);
	this.se = new LatLonPoint(swlat, nelon);
	this.nw = new LatLonPoint(nelat, swlon);
};

/**
 * Returns a string representation of an <code>mxn.BoundingBox</code>
 * @name mxn.BoundingBox#toString
 * @param {number} [places] Optional number of decimal places to display for each lat and long
 * @returns A string like <code>SW: 52.62647572585443, 41.90677719368304, NE: 55.21343254471387, 56.01322251932069</code>
 * @type {string}
 */
BoundingBox.prototype.toString = function(places) {
	var sw;
	var ne;
	
	if (typeof places !== 'undefined') {
		sw = this.sw.toString(places);
		ne = this.ne.toString(places);
	}
	else {
		sw = this.sw;
		ne = this.ne;
	}
	
	return 'SW: ' + sw +  ', NE: ' + ne;
};

/**
 * Returns the <code>mxn.LatLonPoint</code> of the south-west point of the bounding box
 * @returns The south-west point of the bounding box
 * @type {mxn.LatLonPoint}
 */
BoundingBox.prototype.getSouthWest = function() {
	return this.sw;
};

/**
 * Returns the <code>mxn.LatLonPoint</code> of the south-east point of the bounding box
 * @returns The south-east point of the bounding box
 * @type {mxn.LatLonPoint}
 */
BoundingBox.prototype.getSouthEast = function() {
	return this.se;
};

/**
 * Returns the <code>mxn.LatLonPoint</code> of the north-west point of the bounding box
 * @returns The north-west point of the bounding box
 * @type {mxn.LatLonPoint}
 */
BoundingBox.prototype.getNorthWest = function() {
	return this.nw;
};

/**
 * Returns the <code>mxn.LatLonPoint</code> of the north-east point of the bounding box
 * @returns The north-east point of the bounding box
 * @type {mxn.LatLonPoint}
 */
BoundingBox.prototype.getNorthEast = function() {
	return this.ne;
};

/**
 * Determines if this <code>mxn.BoundingBox</code> has a zero area
 * @returns Whether the north-east and south-west points of the bounding box are the same point
 * @type {boolean}
 */
BoundingBox.prototype.isEmpty = function() {
	return this.ne == this.sw; // is this right? FIXME
};

/**
 * Determines whether a given <code>mxn.LatLonPoint</code> is within an <code>mxn.BoundingBox</code>
 * @param {mxn.LatLonPoint} point the point to test with
 * @returns Whether point is within this bounding box
 * @type {boolean}
 */
BoundingBox.prototype.contains = function(point){
	return point.lat >= this.sw.lat && point.lat <= this.ne.lat && 
	((this.sw.lon <= this.ne.lon && point.lon >= this.sw.lon && point.lon <= this.ne.lon) || 
	(this.sw.lon > this.ne.lon && (point.lon >= this.sw.lon || point.lon <= this.ne.lon)));
};

/**
 * Returns an <code>mxn.LatLonPoint</code> with the lat and lon as the height and width of the <code>mxn.BoundingBox</code>
 * @returns A <code>mxn.LatLonPoint</code> containing the height and width of this the <code>mxn.BoundingBox</code>
 * @type {mxn.LatLonPoint}
 */
BoundingBox.prototype.toSpan = function() {
	return new LatLonPoint( Math.abs(this.sw.lat - this.ne.lat), Math.abs(this.sw.lon - this.ne.lon) );
};

/**
 * Extends the <code>mxn.BoundingBox</code> to include the new the <code>mxn.LatLonPoint</code>
 * @param {mxn.LatLonPoint} point The <code>mxn.LatLonPoint</code> around which the <code>mxn.BoundingBox</code> should be extended
 */
BoundingBox.prototype.extend = function(point) {
	var extended = false;
	if (this.sw.lat > point.lat) {
		this.sw.lat = point.lat;
		extended = true;
	}
	if (this.sw.lon > point.lon) {
		this.sw.lon = point.lon;
		extended = true;
	}
	if (this.ne.lat < point.lat) {
		this.ne.lat = point.lat;
		extended = true;
	}
	if (this.ne.lon < point.lon) {
		this.ne.lon = point.lon;
		extended = true;
	}
	
	if (extended) {
		this.se = new LatLonPoint(this.sw.lat, this.ne.lon);
		this.nw = new LatLonPoint(this.ne.lat, this.sw.lon);
	}
	return;
};

/**
 * Determines whether a given <code>mxn.BoundingBox</code> intersects another <code>mxn.BoundingBox</code>
 * @param {mxn.BoundingBox} other The <code>mxn.BoundingBox</code> to test against
 * @returns Whether the current <code>mxn.BoundingBox</code> overlaps the other
 * @type {boolean}
 */
BoundingBox.prototype.intersects = function(other) {
	return this.sw.lat <= other.ne.lat && this.ne.lat >= other.sw.lat && 
	((this.sw.lon <= this.ne.lon && other.sw.lon <= other.ne.lon && this.sw.lon <= other.ne.lon && this.ne.lon >= other.sw.lon) || 
	(this.sw.lon > this.ne.lon && other.sw.lon > other.ne.lon) || 
	(this.sw.lon > this.ne.lon && other.sw.lon <= other.ne.lon && (this.sw.lon <= other.ne.lon || this.ne.lon >= other.sw.lon)) || 
	(this.sw.lon <= this.ne.lon && other.sw.lon > other.ne.lon && (this.ne.lon >= other.sw.lon || this.sw.lon <= other.ne.lon)));
};

//////////////////////////////
//
//  Marker
//
///////////////////////////////

/**
 * Creates a Mapstraction map marker capable of showing an optional <code>infoBubble</code> pop-up.
 * @name mxn.Marker
 * @constructor
 * @param {mxn.LatLonPoint} point The point specifying where on the map the <code>mxn.Marker</code> should be positioned.
 * @exports Marker as mxn.Marker
 */
var Marker = mxn.Marker = function(point) {
	this.api = null;
	this.location = point;
	this.onmap = false;
	this.proprietary_marker = false;
	this.attributes = [];
	this.invoker = new mxn.Invoker(this, 'Marker', function(){return this.api;});
	mxn.addEvents(this, [ 
		'openInfoBubble',	// Info bubble opened
		'closeInfoBubble', 	// Info bubble closed
		'animateMarker',	// Animate marker
		'click',			// Marker clicked
		'dragend',			// Marker drag end
		'rightclick'		// Marker right-clicked
	]);
};

mxn.addProxyMethods(Marker, [ 
	/**
	 * Retrieve the settings from a proprietary marker.
	 * @name mxn.Marker#fromProprietary
	 * @function
	 * @param {string} api The API ID of the proprietary point.
	 * @param {Object} marker The proprietary marker.
	 */
	'fromProprietary',
	
	/**
	 * Hide the marker.
	 * @name mxn.Marker#hide
	 * @function
	 */
	'hide',
	
	/**
	 * Activate the marker animation
	 * @name mxn.Marker#startMarkerAnimation
	 * @function
	 */
	'startMarkerAnimation',
	
	/**
	 * Stop the marker animation
	 * @name mxn.Marker#stopMarkerAnimation
	 * @function
	 */
	'stopMarkerAnimation',
	
	/**
	 * Open the marker's <code>infoBubble</code> pop-up
	 * @name mxn.Marker#openBubble
	 * @function
	 */
	'openBubble',
	
	/**
	 * Closes the marker's <code>infoBubble</code> pop-up
	 * @name mxn.Marker#closeBubble
	 * @function
	 */
	'closeBubble',
	
	/**
	 * Show the marker.
	 * @name mxn.Marker#show
	 * @function
	 */
	'show',
	
	/**
	 * Converts the current Marker to a proprietary one for the API specified by <code>api</code>.
	 * @name mxn.Marker#toProprietary
	 * @function
	 * @param {string} api The API ID of the proprietary marker.
	 * @returns {Object} A proprietary marker.
	 */
	'toProprietary',

	/**
	 * Specific to MS Bing Maps V8 : used to create scaled pushpin icons
	 * @name mxn.Marker#createScaledPushpin
	 * @function
	 * @param {Object} marker The marker Pushpin object.
	 * @param {string} iconUrl Icon URL.
	 * @param {Object} iconSize Icon size Point object.
	 * @param {Object} iconAnchor Icon anchor Point object.
	 * @param {Function} callback Callback function.
	 */
	'createScaledPushpin',

	/**
	 * Updates the Marker with the location of the attached proprietary marker on the map.
	 * @name mxn.Marker#update
	 * @function
	 */
	'update'
]);

/**
 * Sets a proprietary marker as a child of the current <code>mxn.Marker</code>.
 * @name mxn.Marker#setChild
 * @function
 * @param {Object} childMarker The proprietary marker's object
 */
Marker.prototype.setChild = function(childMarker) {
	this.proprietary_marker = childMarker;
	childMarker.mapstraction_marker = this;
	this.onmap = true;
};

/**
 * Sets the properties of a marker via an object literal, which contains the following
 * property name/value pairs:
 * <pre>
 * options = {
 * label: 'marker label; see <code>mxn.Marker.setLabel()</code>',
 * infoBubble: 'infoBubble text or HTML, see <code>mxn.Marker.setInfoBubble()</code>',
 * icon: 'icon image URL, see <code>mxn.Marker.setIcon()</code>',
 * iconSize: 'icon image size, see <code>mxn.Marker.setIcon()</code>',
 * iconAnchor: 'icon image anchor, see <code>mxn.Marker.setIcon()</code>',
 * iconShadow: 'icon shadow image URL, see <code>mxn.Marker.setShadowIcon()</code>',
 * iconShadowSize: 'icon shadow size, see <code>mxn.Marker.setShadowIcon()</code>',
 * infoDiv: 'informational div, see <code>mxn.Marker.setInfoDiv()</code>',
 * draggable: 'draggable state, see <code>mxn.Marker.setDraggable()</code>',
 * hover: 'hover text, see <code>mxn.Marker.setHover()</code>',
 * hoverIcon: 'hover icon URL, see <code>mxn.Marker.setHoverIcon()</code>',
 * openBubble: 'if specified, calls <code>mxn.Marker.openBubble()</code>',
 * closeBubble: 'if specified, calls <code>mxn.Marker.closeBubble()</code>',
 * groupName: 'marker group name, see <code>mxn.Marker.setGroupName()</code>'
 * };
 * </pre>
 *
 * <p>Any other literal name value pairs are added to the marker's list of properties.</p>
 * @param {Object} options An object literal of property name/value pairs.
 */
Marker.prototype.addData = function(options){
	for(var sOptKey in options) {
		if(options.hasOwnProperty(sOptKey)){
			switch(sOptKey) {
				case 'label':
					this.setLabel(options.label);
					break;
				case 'infoBubble':
					this.setInfoBubble(options.infoBubble);
					break;
				case 'icon':
					if(options.iconSize && options.iconAnchor) {
						this.setIcon(options.icon, options.iconSize, options.iconAnchor);
					}
					else if(options.iconSize) {
						this.setIcon(options.icon, options.iconSize);
					}
					else {
						this.setIcon(options.icon);
					}
					break;
				case 'iconShadow':
					if(options.iconShadowSize) {
						this.setShadowIcon(options.iconShadow, [ options.iconShadowSize[0], options.iconShadowSize[1] ]);
					}
					else {
						this.setIcon(options.iconShadow);
					}
					break;
				case 'infoTooltip':
					this.setInfoTooltip(options.infoTooltip);
					break;
				case 'infoDiv':
					this.setInfoDiv(options.infoDiv[0],options.infoDiv[1]);
					break;
				case 'draggable':
					this.setDraggable(options.draggable);
					break;
				case 'hover':
					this.setHover(options.hover);
					break;
				case 'hoverIcon':
					this.setHoverIcon(options.hoverIcon);
					break;
				case 'openBubble':
					this.openBubble();
					break;
				case 'closeBubble':
					this.closeBubble();
					break;
				case 'groupName':
					this.setGroupName(options.groupName);
					break;
				default:
					// don't have a specific action for this bit of
					// data so set a named attribute
					this.setAttribute(sOptKey, options[sOptKey]);
					break;
			}
		}
	}
};

/**
 * Sets the HTML or text content for the marker's <code>InfoBubble</code> pop-up.
 * @param {string} infoBubble The HTML or plain text to be displayed
 */
Marker.prototype.setInfoBubble = function(infoBubble) {
	this.infoBubble = infoBubble;
};

/**
 * Sets the text content and the id of the <code>DIV</code> element to display additional
 * information associated with the marker; useful for putting information in a <code>DIV</code>
 * outside of the map
 * @param {string} infoDiv The HMTML or text content to be displayed
 * @param {string} div The element id to use for displaying the HTML or text content
 */
Marker.prototype.setInfoDiv = function(infoDiv, div){
	this.infoDiv = infoDiv;
	this.div = div;
};

/**
 * Sets the label text of the current <code>mxn.Marker</code>. The label is used in some maps
 * API implementation as the text to be displayed when the mouse pointer hovers over the marker.
 * @name mxn.Marker#setLabel
 * @function
 * @param {string} labelText The text to be used for the label
 */
Marker.prototype.setLabel = function(labelText) {
	this.labelText = labelText;
};

/**
 * Sets the text content for a tooltip on a marker
 * @param {String} tooltipText The text you want displayed
 */
Marker.prototype.setInfoTooltip = function(tooltipText){
	this.tooltipText = tooltipText;
};

/**
 * Sets the icon for a marker
 * @param {string} iconUrl The URL of the image you want to be the icon
 */
Marker.prototype.setIcon = function(iconUrl, iconSize, iconAnchor) {
	this.iconUrl = iconUrl;
	if(iconSize) {
		this.iconSize = iconSize;
	}
	if(iconAnchor) {
		this.iconAnchor = iconAnchor;
	}
};

/**
 * Sets the size of the icon for a marker
 * @param {Array} iconSize The array size in pixels of the marker image: <code>[width, height]</code>
 */
Marker.prototype.setIconSize = function(iconSize) {
	if(iconSize) {
		this.iconSize = iconSize;
	}
};

/**
 * Sets the anchor point for a marker
 * @param {Array} iconAnchor The array offset in pixels of the anchor point from top left: <code>[right, down]</code>
 */
Marker.prototype.setIconAnchor = function(iconAnchor){
	if(iconAnchor) {
		this.iconAnchor = iconAnchor;
	}
};

/**
 * Sets the icon for a marker
 * @param {string} iconUrl The URL of the image you want to be the icon
 */
Marker.prototype.setShadowIcon = function(iconShadowUrl, iconShadowSize){
	this.iconShadowUrl = iconShadowUrl;
	if(iconShadowSize) {
		this.iconShadowSize = iconShadowSize;
	}
};

/**
 * Sets the icon to be used on hover
 * @param {strong} hoverIconUrl The URL of the image to be used
 */
Marker.prototype.setHoverIcon = function(hoverIconUrl){
	this.hoverIconUrl = hoverIconUrl;
};

/**
 * Sets the draggable state of the marker
 * @param {boolean} draggable Set to <code>true</code> if the marker should be draggable by the user
 */
Marker.prototype.setDraggable = function(draggable) {
	this.draggable = draggable;
};

/**
 * Sets that the marker label is to be displayed on hover
 * @param {boolean} hover Set to <code>true</code> if the marker should display the label on hover
 */
Marker.prototype.setHover = function(hover) {
	this.hover = hover;
};

/**
 * Sets the z-index value for the marker
 * @param {number} zIndex Set the z-index value for the marker
 */
Marker.prototype.setZIndex = function(zIndex) {
	this.zIndex = zIndex;
};

/**
 * Add this marker to a named group; used in decluttering a group of markers.
 * @param {string} groupName Name of the marker's group
 * @see mxn.Mapstraction.declutterGroup
 */
Marker.prototype.setGroupName = function(groupName) {
	this.groupName = groupName;
};

/**
 * Set an arbitrary property name and value on a marker
 * @param {string} key The property key name
 * @param {string} value The property value to be associated with the key
 */
Marker.prototype.setAttribute = function(key,value) {
	this.attributes[key] = value;
};

/**
 * Gets the value of a marker's property
 * @param {string} key The key whose value is to be returned
 * @returns {string} The value associated with the key
 */
Marker.prototype.getAttribute = function(key) {
	return this.attributes[key];
};

///////////////
// Polyline ///
///////////////

/**
 * Creates a Mapstraction Polyline; either an open-ended polyline or an enclosed polygon.
 * @name mxn.Polyline
 * @constructor
 * @param {Array} points Array of <code>mxn.LatLonPoint</code> that make up the Polyline.
 * @exports Polyline as mxn.Polyline
 */
var Polyline = mxn.Polyline = function(points) {
	this.api = null;
	this.points = points;
	this.attributes = [];
	this.onmap = false;
	this.proprietary_polyline = false;
	this.pllID = "mspll-"+new Date().getTime()+'-'+(Math.floor(Math.random()*Math.pow(2,16)));
	this.invoker = new mxn.Invoker(this, 'Polyline', function(){return this.api;});
	this.color = "#000000";
	this.width = 3;
	this.opacity = 0.5;
	this.closed = false;
	this.fillColor = "#808080";
	this.fillOpacity = 1.0;
};

mxn.addProxyMethods(mxn.Polyline, [ 

	/**
	 * Retrieve the settings from a proprietary polyline.
	 * @name mxn.Polyline#fromProprietary
	 * @function
	 * @param {string} api The API ID of the proprietary polyline.
	 * @param {Object} polyline The proprietary polyline.
	 */
	'fromProprietary', 
	
	/**
	 * Hide the polyline.
	 * @name mxn.Polyline#hide
	 * @function
	 */
	'hide',
	
	/**
	 * Show the polyline.
	 * @name mxn.Polyline#show
	 * @function
	 */
	'show',
	
	/**
	 * Converts the current Polyline to a proprietary one for the API specified by <code>api</code>.
	 * @name mxn.Polyline#toProprietary
	 * @function
	 * @param {string} api The API ID of the proprietary polyline.
	 * @returns {Object} A proprietary polyline.
	 */
	'toProprietary',
	
	/**
	 * Updates the Polyline with the path of the attached proprietary polyline on the map.
	 * @name mxn.Polyline#update
	 * @function
	 */
	'update'
]);

/**
 * <p>Sets the properties of a polyline via an object literal, which contains the following
 * property name/value pairs:</p>
 * <pre>
 * options = {
 * color: 'line color; see <code>mxn.Polyline.setColor()</code>',
 * width: 'line stroke width; see <code>mxn.Polyline.setWidth()</code>',
 * opacity: 'polyline opacity; see <code>mxn.Polyline.setOpacity()</code>',
 * closed: 'polyline or polygon; see <code>mxn.Polyline.setClosed()</code>',
 * fillColor: 'fill color; see <code>mxn.Polyline.seFillColor()</code>',
 * };
 * </pre>
 *
 * <p>Any other literal name value pairs are added to the marker's list of properties.</p>
 * @param {Object} options An object literal of property name/value pairs.
 */
Polyline.prototype.addData = function(options){
	for(var sOpt in options) {
		if(options.hasOwnProperty(sOpt)){
			switch(sOpt) {
				case 'color':
					this.setColor(options.color);
					break;
				case 'width':
					this.setWidth(options.width);
					break;
				case 'opacity':
					this.setOpacity(options.opacity);
					break;
				case 'closed':
					this.setClosed(options.closed);
					break;
				case 'fillColor':
					this.setFillColor(options.fillColor);
					break;
				case 'fillOpacity':
					this.setFillOpacity(options.fillOpacity);
					break;
				default:
					this.setAttribute(sOpt, options[sOpt]);
					break;
			}
		}
	}
};

/**
 * Sets a proprietary polyline as a child of the current <code>mxn.Polyline</code>.
 * @param {Object} childPolyline The proprietary polyline's object
 */
Polyline.prototype.setChild = function(childPolyline) {
	this.proprietary_polyline = childPolyline;
	this.onmap = true;
};

/**
 * Sets the line color for the polyline.
 * @param {string} color RGB color expressed in the form <code>#RRGGBB</code>
 */
Polyline.prototype.setColor = function(color){
	this.color = (color.length==7 && color[0]=="#") ? color.toUpperCase() : color;
};

/**
 * Sets the line stroke width of the polyline
 * @param {number} width Line stroke width in pixels.
 */
Polyline.prototype.setWidth = function(width){
	this.width = width;
};

/**
 * Sets the polyline opacity.
 * @param {number} opacity A number between <code>0.0</code> (transparent) and <code>1.0</code> (opaque)
 */
Polyline.prototype.setOpacity = function(opacity){
	this.opacity = opacity;
};

/**
 * Marks the polyline as a closed polygon
 * @param {boolean} closed Specify as <code>true</code> to mark the polyline as an enclosed polygon
 */
Polyline.prototype.setClosed = function(closed){
	this.closed = closed;
};

/**
 * Sets the fill color for a closed polyline.
 * @param {string} color RGB color expressed in the form <code>#RRGGBB</code>
 */
Polyline.prototype.setFillColor = function(fillColor) {
	this.fillColor = (fillColor.length==7 && fillColor[0]=="#") ? fillColor.toUpperCase() : fillColor;
};

/**
 * Fill opacity for a closed polyline as a float between 0.0 and 1.0
 * @param {Float} fill opacity
 */
Polyline.prototype.setFillOpacity = function(sFillOpacity) {
	this.fillOpacity = sFillOpacity;
};

/**
 * Set an arbitrary property name and value on a polyline
 * @param {string} key The property key name
 * @param {string} value The property value to be associated with the key
 */
Polyline.prototype.setAttribute = function(key,value) {
	this.attributes[key] = value;
};

/**
 * Gets the value of a polyline's property
 * @param {string} key The key whose value is to be returned
 * @returns {string} The value associated with the key
 */
Polyline.prototype.getAttribute = function(key) {
	return this.attributes[key];
};

/**
 * Simplifies a polyline, averaging and reducing the points
 * @param {number} tolerance The simplification tolerance; 1.0 is a good starting point
 */
Polyline.prototype.simplify = function(tolerance) {
	var reduced = [];

	// First point
	reduced[0] = this.points[0];

	var markerPoint = 0;

	for (var i = 1; i < this.points.length-1; i++){
		if (this.points[i].distance(this.points[markerPoint]) >= tolerance)
		{
			reduced[reduced.length] = this.points[i];
			markerPoint = i;
		}
	}

	// Last point
	reduced[reduced.length] = this.points[this.points.length-1];

	// Revert
	this.points = reduced;
};

///////////////
// Radius	//
///////////////

/**
 * Creates a Mapstraction Radius for drawing circles around a given point. Note that creating
 * a radius performs a lot of initial calculation which can lead to increased page load times.
 * @name mxn.Radius
 * @constructor
 * @param {mxn.LatLonPoint} center Central <code>mxn.LatLonPoint</code> of the radius
 * @param {number} quality Number of points that comprise the approximated circle (20 is a good starting point)
 * @exports Radius as mxn.Radius
 */
var Radius = mxn.Radius = function(center, quality) {
	this.center = center;
	var latConv = center.latConv();
	var lonConv = center.lonConv();

	// Create Radian conversion constant
	var rad = Math.PI / 180;
	this.calcs = [];

	for(var i = 0; i < 360; i += quality){
		this.calcs.push([Math.cos(i * rad) / latConv, Math.sin(i * rad) / lonConv]);
	}
};

/**
 * Returns the <code>mxn.Polyline</code> of a circle around the point based on a new radius value.
 * @param {number} radius The new radius value
 * @param {string} color RGB fill color expressed in the form <code>#RRGGBB</code>
 * @returns {mxn.Polyline} The calculated <code>mxn.Polyline</code>
 */
Radius.prototype.getPolyline = function(radius, color) {
	var points = [];
	
	for(var i = 0; i < this.calcs.length; i++){
		var point = new LatLonPoint(
			this.center.lat + (radius * this.calcs[i][0]),
			this.center.lon + (radius * this.calcs[i][1])
		);
		points.push(point);
	}
	
	// Add first point
	points.push(points[0]);

	var line = new mxn.Polyline(points);
	//TODO : line.setClosed(false);
	line.setColor(color);

	return line;
};

//////////////////////////////
//
// TileMap
//
///////////////////////////////

/**
 * <p>Creates a standalone Mapstraction tile map, which can be selected for display in addition
 * to the built in Mapstraction map types. When added to the map, a tile map is automatically
 * added to the Mapstraction Map Type control, if present.</p>
 *
 * <p>Creating a TileMap requires providing a templated map tile server URL. Use the following
 * template codes to specify where the parameters should be substituted in the templated URL.
 * <ul>
 * <li><code>{S}</code> is the (optional) subdomain to be used in the URL.</li>
 * <li><code>{Z}</code> is the zoom level.</li>
 * <li><code>{X}</code> is the longitude of the tile.</li>
 * <li><code>{Y}</code> is the latitude of the tile.</li>
 * </ul>
 * </p>
 *
 * <p>Some examples of templated tile server URLs are ...
 * <ul>
 * <li>OpenStreetMap - <code>http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png</code></li>
 * <li>Stamen Toner - <code>http://tile.stamen.com/toner/{z}/{z}/{y}.png</code></li>
 * <li>MapQuest OSM - <code>http://otile{s}.mqcdn.com/tiles/1.0.0/map/{z}/{x}/{y}.jpg</code></li>
 * <li>MapQuest Open Aerial - <code>http://otile{s}.mqcdn.com/tiles/1.0.0/sat/{z}/{x}/{y}.jpg</code></li>
 * </ul>
 * </p>
 *
 * @name mxn.TileMap
 * @constructor
 * @param {Object} properties Object literal that defines the tile map.
 * @param {String} properties.url Template URL of the tile map.
 * @param {String} properties.name The name of the tile map; this should be unique across all tile maps added to the map.
 * @param {String} properties.options.label The label to be used for the tile map in the Map Type control.
 * @param {String} [properties.options.alt] Alternate text for the tile map; used as hover text if the Map Type control supports this.
 * @param {String} [properties.options.attribution] The attribution and/or copyright text to use for the tile map.
 * @param {Float} [properties.options.opacity] The opacity of the tile map; from 0.0 (transparent) to 1.0 (opaque). Default: 1.0.
 * @param {Int} [properties.options.minZoom] Minimum (furthest out) zoom level that the tile map tiles are available for. Default: 1.
 * @param {Int} [properties.options.maxZoom] Maximum (closest in) zoom level that the tile map tiles are available for. Default: 18.
 * @param {String|String[]} [properties.options.subdomains] List of subdomains that the tile map tiles served from <code>url</code> refers to. Can be specified as a string, <code>abc</code> or as an array, <code>[1, 2, 3]</code>
 * @return {Object} The tile map object
 * @exports TileMap as mxn.TileMap
 */
var TileMap = mxn.TileMap = function(properties) {
	this.api = null;
	this.mxn = null;
	this.map = null;
	this.index = null;
	this.prop_tilemap = null;
	this.properties = this.applyDefaults(properties);
	this.invoker = new mxn.Invoker(this, 'TileMap', function() {
		return this.api;
	});

	mxn.addEvents(this, [
		'tileMapAdded',
		'tileMapAddedToMapTypeControl',
		'tileMapRemovedFromMapTypeControl',
		'tileMapShown',
		'tileMapHidden'
	]);
};

mxn.addProxyMethods(TileMap, [
	'addToMapTypeControl',
	'hide',
	'removeFromMapTypeControl',
	'show',
	'toProprietary'
]);

mxn.TileMap.prototype.applyDefaults = function(properties) {
	return {
		url: properties.url,
		name: properties.name,
		type: properties.type,
		options: {
			label: properties.options.label,
			alt: (properties.options.alt || null),
			attribution: (properties.options.attribution || null),
			opacity: (properties.options.opacity || 1.0),
			minZoom: (properties.options.minZoom ? Number(properties.options.minZoom) : 1),
			maxZoom: (properties.options.maxZoom ? Number(properties.options.maxZoom) : 18),
			subdomains: (properties.options.subdomains || null)
		}
	};
};


///////////////
// Radar    ///
///////////////

/**
 * Creates a new radar object for drawing circles around a point, does a lot of initial calculation to increase load time
 * @name mxn.Radar
 * @constructor
 * @param {LatLonPoint} center LatLonPoint of the radar pivot
 * @param {Object} radarOptions options for the radar settings
 * Keys are: fov, heading, radius, quality, color, opacity, width, fillColor, fillOpacity.
 * @exports Radar as mxn.Radar
 */
var Radar = mxn.Radar = function(center, radarOptions) {
	
	this.center = center;
	this.api = null;
	this.mapstraction = null;
	this.onmap = false;
	this.proprietary_radar = false;
	this.radID = "msrad-"+new Date().getTime()+'-'+(Math.floor(Math.random()*Math.pow(2,16)));
	this.attributes = [];
	this.clickable = false;
	this.linkToZoom = false;
	this.currentZoomLevel = 10;
	// radar radius linked to the zoom level
	if (radarOptions.linkToZoom) {
		this.linkToZoom = true;
		// define the current zoom level of the map
		this.currentZoomLevel = 10;
	}
	// store the current view hlookat
	this.currentViewHeading = 0;
	
	//view angle in degrees
	if ( typeof radarOptions.fov=="undefined" || radarOptions.fov < 1 || radarOptions.fov > 180) {
		radarOptions.fov = 90;
	}
	
	this.fov = radarOptions.fov;
	//starting angle in degrees normalized (90° for 3 o'clock)
	if (typeof radarOptions.heading=="undefined") {
		radarOptions.heading = -Math.round(this.fov / 2);
	}else{
		radarOptions.heading = radarOptions.heading - Math.round(this.fov / 2);
	}
	//change heading for engine rotation preset (for krpano : +90°)
	if (typeof radarOptions.enginePreset!="undefined" && parseInt(radarOptions.enginePreset)) {
		radarOptions.heading += radarOptions.enginePreset;
	}
	// set rotation to clockwise direction 
	this.heading = -radarOptions.heading;
	
	//set init fov value and prepare current fov incidence value
	this.initFov = radarOptions.fov;
	this.fovIncidence = this.initFov - radarOptions.fov;
	
	//radius
	if ( typeof radarOptions.radius=="undefined" || radarOptions.radius < 1 || radarOptions.radius > 20000) {
		radarOptions.radius = 8000;
	}
	this.radius = radarOptions.radius;
	//quality
	if ( typeof radarOptions.quality=="undefined" || radarOptions.quality < 1 || radarOptions.quality > 20) {
		radarOptions.quality = 8;
	}
	this.quality = radarOptions.quality;
	this.color = ktools.Color.htmlColor(radarOptions.color, '#FFFFFF');
	//(typeof radarOptions.color!="undefined" && radarOptions.color.length==7 && radarOptions.color[0]=="#") ? radarOptions.color.toUpperCase() : '#FFFFFF';
	this.opacity = (typeof radarOptions.opacity!="undefined" && !isNaN(parseFloat(radarOptions.opacity)) && radarOptions.opacity>=0 && radarOptions.opacity<=1) ? radarOptions.opacity : 0.5;
	this.width = (typeof radarOptions.width!="undefined" && !isNaN(parseInt(radarOptions.width)) && radarOptions.width>0 && radarOptions.width<10) ? radarOptions.width : 1;
	this.fillColor = ktools.Color.htmlColor(radarOptions.fillColor, '#FFFFFF');
	//(typeof radarOptions.fillColor!="undefined" && radarOptions.fillColor.length==7 && radarOptions.fillColor[0]=="#") ? radarOptions.fillColor.toUpperCase() : '#FFFFFF';
	this.fillOpacity = (typeof radarOptions.fillOpacity!="undefined" && !isNaN(parseFloat(radarOptions.fillOpacity)) && radarOptions.fillOpacity>=0 && radarOptions.fillOpacity<=1) ? radarOptions.fillOpacity : 0.3;
	
	this.invoker = new mxn.Invoker(this, 'Radar', function(){return this.api;});
	mxn.addEvents(this, [ 
	             		'mouseMoveRadar', 	// Radar move on mouse over
	             		'changeDirectionRadar', //Radar change direction (heading and fov)
	             		'click'				// Radar clicked
	             	]);
	
	//add polyline object
	this.polyline = this.getPolyline();
};

mxn.addProxyMethods(Radar, [ 

	/**
	 * Hide the radar.
	 * @name mxn.Radar#hide
	 * @function
	 */
	'hide',
	
	/**
	 * Show the radar.
	 * @name mxn.Radar#show
	 * @function
	 */
	'show',
	
	/**
	 * Converts the current Radar Polyline to a proprietary one for the API specified by apiId.
	 * @name mxn.Radar#toProprietary
	 * @function
	 * @param {String} apiId The API ID of the proprietary radar polyline.
	 * @returns A proprietary radar polyline.
	 */
	'toProprietary',
	
	/**
	 * Bind Radar to the mouse position.
	 * @name mxn.Radar#mouseMove
	 * @function
	 */
	'mouseMove',
	
	/**
	 * Activate the click on the radar.
	 * @name mxn.Radar#activateClick
	 * @function
	 */
	'activateClick'
]);

/**
 * addData conviniently set a hash of options on a marker
 * @param {Object} options An object literal hash of key value pairs. 
 * Keys are: mouseMove, activateClick.
 */
Radar.prototype.addData = function(options){
	for(var sOptKey in options) {
		if(options.hasOwnProperty(sOptKey)){
			switch(sOptKey) {
				case 'mouseMouve':
					this.mouseMove();
					break;
				case 'activateClick':
					this.activateClick();
					break;
				default:
					// don't have a specific action for this bit of
					// data so set a named attribute
					this.setAttribute(sOptKey, options[sOptKey]);
					break;
			}
		}
	}
};

Radar.prototype.setChild = function(some_proprietary_radar) {
	this.proprietary_radar = some_proprietary_radar;
	this.onmap = true;
};

/**
 * Set an arbitrary key/value pair on a radar
 * @param {String} key
 * @param value
 */
Radar.prototype.setAttribute = function(key,value) {
	this.attributes[key] = value;
};

/**
 * Gets the value of "key"
 * @param {String} key
 * @returns value
 */
Radar.prototype.getAttribute = function(key) {
	return this.attributes[key];
};

/**
 * Returns polyline of a circle around the point based on new radar
 * @returns {Polyline} Radar polyline
 */
Radar.prototype.getPolyline = function() {
	
	var points = KolorMap.util.generatePolygonPoints(this, this.center);
	
	var polyline = new Polyline(points);
	polyline.setClosed(true);
	polyline.setColor(this.color);
	polyline.setOpacity(this.opacity);
	polyline.setWidth(this.width);
	polyline.setFillColor(this.fillColor);
	polyline.setFillOpacity(this.fillOpacity);
	
	return polyline;
};

/**
 * @description Change de heading and fov values of the radar.
 * @name mxn.Radar#changeDirection
 * @param {Number} heading The heading to draw the proprietary radar polyline.
 * @param {Number} fov The fov value to draw the proprietary radar polyline.
*/
Radar.prototype.changeDirection = function(heading, fov) {
	var centerPoint = this.center;
	var selfRadar = this;
	
	//update the current fov value and it's incidence between radar init and current fov value
	selfRadar.fovIncidence = selfRadar.initFov - fov;
	selfRadar.fov = fov;
	
	var bearingOrientation = (heading + 360 - Math.round(selfRadar.fovIncidence / 2)) % 360; //convert heading into 360 degrees
	
	//rotate the current radar polygon and update radar object
	selfRadar =	KolorMap.util.rotation(selfRadar, centerPoint, bearingOrientation, selfRadar.mapstraction);
	
	this.changeDirectionRadar.fire( { 'radar': this } );
};

})();
