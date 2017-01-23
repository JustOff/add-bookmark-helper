var abHere2 = {
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
		var annoObj = { name: 'abhere2/sortByName', value: checked, type: Ci.nsIAnnotationService.TYPE_INT32, flags: 0, expires: Ci.nsIAnnotationService.EXPIRE_NEVER };
		var txn = new PlacesSetItemAnnotationTransaction(gEditItemOverlay._itemId, annoObj);
		PlacesUtils.transactionManager.doTransaction(txn);
	}
}

//===================================================
//XXX: content/browser/places/editBookmarkOverlay.js
//===================================================

//*** implement: update "sortByName" checkbox on initPanel
abHere2.hookFunc(gEditItemOverlay, "initPanel",
	'if (this._itemType == Ci.nsINavBookmarksService.TYPE_BOOKMARK)',
	'if (this._itemType == Ci.nsINavBookmarksService.TYPE_FOLDER) {' +
	'    this._element("sortByNameCheckbox").checked = PlacesUtils.annotations.itemHasAnnotation(this._itemId, "abhere2/sortByName");' +
	'}' +
	'$&');

//*** implement: decide "sortByName" checkbox display or not
abHere2.hookFunc(gEditItemOverlay, "_showHideRows",
	/}/,
	'var isFolder = this._itemId != -1 && this._itemType == Ci.nsINavBookmarksService.TYPE_FOLDER;' +
	'this._element("sortByNameCheckbox").collapsed = !isFolder || this._readOnly || this._hiddenRows.indexOf("sortByName") != -1;' +
	'$&');
