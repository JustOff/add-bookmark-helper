Components.utils.import("resource://gre/modules/Preferences.jsm");

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

	get defaultInsertionIndex() {
		return (Preferences.get("extensions.abh2me.misc.insertTop", true) ? 0 : -1);
	},

	get isTagsInline() {
		return Preferences.get("extensions.abh2me.misc.tagsInline", true);
	},

	get panelWidth() {
		return Preferences.get("extensions.abh2me.bmProp.width", 350);
	},
	set panelWidth(value) {
		return Preferences.set("extensions.abh2me.bmProp.width", (value < 0 ? 0 : value));
	},

	get folderTreeHeight() {
		return Preferences.get("extensions.abh2me.bmProp.height.folderTree", 150);
	},
	set folderTreeHeight(value) {
		return Preferences.set("extensions.abh2me.bmProp.height.folderTree", (value < 0 ? 0 : value));
	},

	get tagsSelectorHeight() {
		return Preferences.get("extensions.abh2me.bmProp.height.tagsSelector", 75);
	},
	set tagsSelectorHeight(value) {
		return Preferences.set("extensions.abh2me.bmProp.height.tagsSelector", (value < 0 ? 0 : value));
	},

	onresizeDialog: function(event) {
		var folderTree = document.getElementById("editBMPanel_folderTreeRow");
		folderTree.height = folderTree.collapsed
								? abH2me.folderTreeHeight
								: abH2me.folderTreeHeight = folderTree.boxObject.height;

		var tagsSelector = document.getElementById("editBMPanel_tagsSelectorRow");
		tagsSelector.height = tagsSelector.collapsed
									? abH2me.tagsSelectorHeight
									: abH2me.tagsSelectorHeight = tagsSelector.boxObject.height;
	},

	getRowHeight: function(id) {
		var height = 0;
		switch (id) {
		case "editBMPanel_folderTreeRow":
			height = abH2me.folderTreeHeight;
			break;
		case "editBMPanel_tagsSelectorRow":
			height = abH2me.tagsSelectorHeight;
			break;
		}
		return height;
	},

	expandRows: function() {
		var nameRow = document.getElementById("editBMPanel_nameRow");
		if (!nameRow.collapsed && Preferences.get("extensions.abh2me.bmProp.expand.folderRow", false)) {
			setTimeout(function(){ gEditItemOverlay.toggleFolderTreeVisibility(); }, 0);
		}
		var tagsRow = document.getElementById("editBMPanel_tagsRow");
		if (!tagsRow.collapsed && Preferences.get("extensions.abh2me.bmProp.expand.tagsRow", false)) {
			setTimeout(function(){ gEditItemOverlay.toggleTagsSelector(); }, 0);
		}
	},

	saveExpanderStatus: function(id) {
		switch (id) {
		case "editBMPanel_foldersExpander":
			var nameRow = document.getElementById("editBMPanel_nameRow");
			if (nameRow.collapsed) break;
			var folderTree = document.getElementById("editBMPanel_folderTreeRow");
			Preferences.set("extensions.abh2me.bmProp.expand.folderRow", !folderTree.collapsed);
			break;
		case "editBMPanel_tagsSelectorExpander":
			var tagsSelector = document.getElementById("editBMPanel_tagsSelectorRow");
			Preferences.set("extensions.abh2me.bmProp.expand.tagsRow", !tagsSelector.collapsed);
			break;
		}
	},

	trySortFolderByName: function(itemId) {
		var sortByName = PlacesUtils.annotations.itemHasAnnotation(itemId, 'abh2me/sortByName')
		              && PlacesUtils.annotations.getItemAnnotation(itemId, 'abh2me/sortByName');
		if (sortByName) {
			var txn = new PlacesSortFolderByNameTransaction(itemId);
			PlacesUtils.transactionManager.doTransaction(txn);
		}
	}
}

//===================================================
//XXX: content/browser/places/editBookmarkOverlay.js
//===================================================

//*** implement: move multi items when user select a different folder
gEditItemOverlay.moveItems = function(aItemIds, aNewContainer, aNewIndex) {
	var transactions = [];
	for (var i = 0; i < aItemIds.length; ++i) {
		transactions.push(new PlacesMoveItemTransaction(aItemIds[i], aNewContainer, aNewIndex));
	}
	return new PlacesAggregatedTransaction("Move items childTxn", transactions);
}
abH2me.hookFunc(gEditItemOverlay, "onFolderMenuListCommand",
	'var txn = new PlacesMoveItemTransaction(this._itemId, container, PlacesUtils.bookmarks.DEFAULT_INDEX);',
	'var txn = this.moveItems(this._multiEdit ? this._itemIds : [this._itemId], container, abH2me.defaultInsertionIndex);');


//*** implement: create the new folder at user's insertionPoint
abH2me.hookFunc(gEditItemOverlay, "_determineInfo",
	/}$/,
	'this._defaultInsertionPoint = aInfo && aInfo.defaultInsertionPoint; $&');

abH2me.hookFunc(gEditItemOverlay, "newFolder",
	'var txn = new PlacesCreateFolderTransaction(defaultLabel, ip.itemId, ip.index);',
	'ip.index = (ip.itemId == this._defaultInsertionPoint.itemId) ? this._defaultInsertionPoint.index : abH2me.defaultInsertionIndex; $&');


//*** implement: ensureRowIsVisible when folderTree is expanded
abH2me.hookFunc(gEditItemOverlay, "toggleFolderTreeVisibility",
	"this._folderTree.focus();",
	'this._folderTree.boxObject.ensureRowIsVisible(this._folderTree.view.selection.currentIndex);'+
	'$&');


//===================================================
//XXX: content/browser/places/bookmarkProperties.js
//===================================================

//*** implement: support to create multi bookmark items without need a new folder as container
const BOOKMARK_ITEMS = 9;

BookmarkPropertiesPanel._getCreateNewBookmarksTransaction = function(aContainer, aIndex) {
	var transactions = [];
	if (this._tabInfos.length) {
		for (var i = 0; i < this._tabInfos.length; ++i) {
			var uri = this._tabInfos[i].uri;
			var title = this._tabInfos[i].title;
			var tags = this._tabInfos[i].tags;
			var itemId = PlacesUtils.getMostRecentBookmarkForURI(this._tabInfos[i].uri);
			// add bookmark: only if page is not bookmarked, or this is not tagging mode.
			if (itemId == -1 || tags.length == 0) {
				transactions.push(new PlacesCreateBookmarkTransaction(uri, aContainer, aIndex, title));
			}
			// add tags: only if this is tagging mode
			if (tags.length) {
				transactions.push(new PlacesTagURITransaction(uri, tags));
			}
		}
	}
	return new PlacesAggregatedTransaction("Create items childTxn", transactions);
}

BookmarkPropertiesPanel._getItemIdListForAggregateTransactions = function(aggregateTxn) {
	var transactions = aggregateTxn.childTransactions;
	var itemIds = [];
	for (var i = 0; i < transactions.length; ++i) {
		var itemId = PlacesUtils.getMostRecentBookmarkForURI(transactions[i].item.uri);
		if (itemIds.indexOf(itemId) == -1) {
			itemIds.push(itemId);
		}
	}
	return itemIds;
}

abH2me.hookFunc(BookmarkPropertiesPanel, "_getDialogTitle",
	'if (this._itemType == BOOKMARK_ITEM)',
	'if (this._itemType == BOOKMARK_ITEMS) return this._strings.getString("dialogTitleAddMulti"); $&');

abH2me.hookFunc(BookmarkPropertiesPanel, "_getAcceptLabel",
	'if (this._URIs.length)',
	'if (this._URIs.length || this._tabInfos)');

abH2me.hookFunc(BookmarkPropertiesPanel, "_determineItemInfo",
	'case "bookmark":',
	'case "bookmarks":'+
	'this._itemType = BOOKMARK_ITEMS;'+
	'this._hiddenRows.push("name");'+
	'this._hiddenRows.push("location");'+
	'this._hiddenRows.push("keyword");'+
	'this._hiddenRows.push("description");'+
	'this._hiddenRows.push("loadInSidebar");'+
	'if (!Preferences.get("extensions.abh2me.starUI.row.tags", true)) this._hiddenRows.push("tags");'+
	'if ("tabInfoList" in dialogInfo) { this._tabInfos = dialogInfo.tabInfoList; }'+
	'break;'+
	'$&');

abH2me.hookFunc(BookmarkPropertiesPanel, "_createNewItem",
	'case BOOKMARK_FOLDER:',
	'case BOOKMARK_ITEMS:'+
	'txn = this._getCreateNewBookmarksTransaction(container, index);'+
	'break;'+
	'$&');

abH2me.hookFunc(BookmarkPropertiesPanel, "_createNewItem",
	'this._itemId = PlacesUtils.bookmarks.getIdForItemAt(container, index)',
	'this._itemId = (this._itemType == BOOKMARK_ITEMS ? this._getItemIdListForAggregateTransactions(txn) : $&)');

abH2me.hookFunc(BookmarkPropertiesPanel, "_createNewItem",
	"PlacesUtils.transactionManager.doTransaction(txn);",
	'$& abH2me.trySortFolderByName(container);');


//*** implement: create the new folder at user's insertionPoint (pass the insertionPoint to gEditItemOverlay)
abH2me.hookFunc(BookmarkPropertiesPanel, "_fillAddProperties",
	'hiddenRows: this._hiddenRows',
	'$&, defaultInsertionPoint: this._defaultInsertionPoint');


//*** implement: customize folderTree & tagsSelector's height
abH2me.hookFunc(BookmarkPropertiesPanel, "handleEvent",
	'newHeight -= this._elementsHeight[id];',
	'newHeight -= abH2me.getRowHeight(id);');

abH2me.hookFunc(BookmarkPropertiesPanel, "handleEvent",
	'newHeight += this._elementsHeight[id];',
	'newHeight += abH2me.getRowHeight(id);');

abH2me.hookFunc(BookmarkPropertiesPanel, "handleEvent",
	"window.resizeTo(window.outerWidth, newHeight);",
	'this._element("folderTreeRow").flex = this._element("tagsSelectorRow").collapsed ? "1" : "0";'+
	'$&');


//*** implement: customize BookmarkPropertiesPanel's width
abH2me.hookFunc(BookmarkPropertiesPanel, "onDialogLoad",
	'window.sizeToContent();',
	'document.documentElement.width = abH2me.panelWidth;'+
	'$&');


//*** group the tags in line
abH2me.hookFunc(BookmarkPropertiesPanel, "onDialogLoad",
	/}$/,
	'document.getAnonymousNodes(this._element("tagsSelector"))[1].lastChild.style.display = (abH2me.isTagsInline ? "inline-block" : ""); $&');


//*** expand the folderTree & tagsSelector
abH2me.hookFunc(BookmarkPropertiesPanel, "onDialogLoad",
	/}$/,
	'abH2me.expandRows(); $&');


//*** save folderTree & tagsSelector expander's status
abH2me.hookFunc(BookmarkPropertiesPanel, "onDialogLoad",
	/}$/,
	'this._element("foldersExpander").addEventListener("command", this, false);'+
	'this._element("tagsSelectorExpander").addEventListener("command", this, false);'+
	'$&');

abH2me.hookFunc(BookmarkPropertiesPanel, "onDialogUnload",
	/}$/,
	'this._element("foldersExpander").removeEventListener("command", this, false);'+
	'this._element("tagsSelectorExpander").removeEventListener("command", this, false);'+
	'$&');

abH2me.hookFunc(BookmarkPropertiesPanel, "handleEvent",
	'case "input":',
	'case "command":'+
	'abH2me.saveExpanderStatus(target.id);'+
	'break;'+
	'$&');


//*** when bookmarkLink(), use "Add" as accept button's label
abH2me.hookFunc(BookmarkPropertiesPanel, "_getAcceptLabel",
	'if (this._dummyItem || this._loadInSidebar)',
	'if (this._dummyItem || this._loadInSidebar || this._uri)');
