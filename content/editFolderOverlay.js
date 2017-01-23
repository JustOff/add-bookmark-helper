var abH2me = {
	hookFunc: function(obj, name, matchCode, replaceCode) {
		try {
			if (typeof(matchCode) === 'string') {
				matchCode = new RegExp(matchCode.replace(/([\(\[\|\.\?\*\+\]\)])/g, '\\$1').replace(/, /g, ',[\\s\\n]+'), 'g');
			}
			var _proto_ = obj[name].prototype;
			var orgCode = obj[name].toString();
			var newCode = obj[name].toString().replace(matchCode, replaceCode);
			if (orgCode == newCode) {
				throw "MatchError:\n@matchCode: "+matchCode;
			} else {
				eval("obj[name]="+newCode);
				obj[name].prototype = _proto_;
			}
		} catch(ex) { Components.utils.reportError("[ABH2] Failed to hook function: <"+obj+"."+name+"> "+ex+"\n"+newCode); }
	},

	onSortByNameCheckboxCommand: function(checked) {
		var annoObj = { name: 'abh2me/sortByName', value: checked, type: Ci.nsIAnnotationService.TYPE_INT32, flags: 0, expires: Ci.nsIAnnotationService.EXPIRE_NEVER };
		var txn = new PlacesSetItemAnnotationTransaction(gEditItemOverlay._itemId, annoObj);
		PlacesUtils.transactionManager.doTransaction(txn);
	}
}

//===================================================
//XXX: content/browser/places/editBookmarkOverlay.js
//===================================================

//*** implement: update "sortByName" checkbox on initPanel
abH2me.hookFunc(gEditItemOverlay, "initPanel",
	'if (this._itemType == Ci.nsINavBookmarksService.TYPE_BOOKMARK)',
	'if (this._itemType == Ci.nsINavBookmarksService.TYPE_FOLDER) {' +
	'    this._element("sortByNameCheckbox").checked = PlacesUtils.annotations.itemHasAnnotation(this._itemId, "abh2me/sortByName");' +
	'}' +
	'$&');

//*** implement: decide "sortByName" checkbox display or not
abH2me.hookFunc(gEditItemOverlay, "_showHideRows",
	/}/,
	'var isFolder = this._itemId != -1 && this._itemType == Ci.nsINavBookmarksService.TYPE_FOLDER;' +
	'this._element("sortByNameCheckbox").collapsed = !isFolder || this._readOnly || this._hiddenRows.indexOf("sortByName") != -1;' +
	'$&');
