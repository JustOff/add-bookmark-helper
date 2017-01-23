Components.utils.import("resource://gre/modules/Preferences.jsm");

var abHere2 = {
	strBundle: Components.classes['@mozilla.org/intl/stringbundle;1'].getService(Components.interfaces.nsIStringBundleService)
				.createBundle('chrome://abhere2/locale/abhere2.properties'),

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

	get isInsertTop() {
		return Preferences.get("extensions.abhere2.misc.insertTop", true);
	},

	get isTagsInline() {
		return Preferences.get("extensions.abhere2.misc.tagsInline", true);
	},

	get isTagsRowExpand() {
		return Preferences.get("extensions.abhere2.starUI.expand.tagsRow", true);
	},
	set isTagsRowExpand(value) {
		return Preferences.set("extensions.abhere2.starUI.expand.tagsRow", value);
	},

	get panelWidth() {
		return Preferences.get("extensions.abhere2.starUI.width", 350);
	},

	getBoxHeight: function(boxId) {
		return Preferences.get("extensions.abhere2.starUI.height."+boxId, 50);
	},

	setBoxHeight: function(boxId, height) {
		return Preferences.set("extensions.abhere2.starUI.height."+boxId, (height < 0 ? 0 : height));
	},

	getPrefFolderId: function(prefName, defaultId) {
		var folderId = Preferences.get(prefName, 0);
		folderId = (folderId ? Math.abs(folderId) : defaultId);
		function isFolderIdValid(aItemId) {
			try {
				return (PlacesUtils.bookmarks.getItemType(aItemId) == PlacesUtils.bookmarks.TYPE_FOLDER);
			} catch(e) {
				return false;
			}
		}
		return (isFolderIdValid(folderId) ? folderId : defaultId);
	},

	get prefBookmarkFolderId() {
		return abHere2.getPrefFolderId("extensions.abhere2.folderId.bookmark", PlacesUtils.bookmarksMenuFolderId);
	},
	set prefBookmarkFolderId(folderId) {
		if (Preferences.get("extensions.abhere2.folderId.bookmark", 0) < 0) return;
		Preferences.set("extensions.abhere2.folderId.bookmark", folderId);
	},

	get prefLivemarkFolderId() {
		return abHere2.getPrefFolderId("extensions.abhere2.folderId.livemark", PlacesUtils.toolbarFolderId);
	},
	set prefLivemarkFolderId(folderId) {
		if (Preferences.get("extensions.abhere2.folderId.livemark", 0) < 0) return;
		Preferences.set("extensions.abhere2.folderId.livemark", folderId);
	},

	get unsortedBookmarksFolderId() {
		return abHere2.getPrefFolderId("extensions.abhere2.folderId.unsorted", PlacesUtils.unfiledBookmarksFolderId);
	},
	set unsortedBookmarksFolderId(folderId) {
		if (Preferences.get("extensions.abhere2.folderId.unsorted", 0) < 0) return;
		Preferences.set("extensions.abhere2.folderId.unsorted", folderId);
	},

	get hiddenRows() {
		var aH = [];
		if (!Preferences.get("extensions.abhere2.starUI.row.name"         , true)) aH.push("'name'");
		if (!Preferences.get("extensions.abhere2.starUI.row.folderPicker" , true)) aH.push("'folderPicker'");
		if (!Preferences.get("extensions.abhere2.starUI.row.tags"         , true)) aH.push("'tags'");
		if (!Preferences.get("extensions.abhere2.starUI.row.description"  , true)) aH.push("'description'");
		if (!Preferences.get("extensions.abhere2.starUI.row.keyword"      , true)) aH.push("'keyword'");
		if (!Preferences.get("extensions.abhere2.starUI.row.location"     , true)) aH.push("'location'");
		if (!Preferences.get("extensions.abhere2.starUI.row.loadInSidebar", true)) aH.push("'loadInSidebar'");
		if (!Preferences.get("extensions.abhere2.starUI.row.feedLocation" , true)) aH.push("'feedLocation'");
		if (!Preferences.get("extensions.abhere2.starUI.row.siteLocation" , true)) aH.push("'siteLocation'");
		return "[" + aH.join(",") + "]";
	},

	get1stElementByAttribute: function(target, name, value) {
		for (var i = 0; i < target.childNodes.length; i++) {
			var elmt = target.childNodes[i];
			if (elmt.hasAttribute(name)) {
				var sep = (name=="class" ? "|\\s+" : "");
				var re = new RegExp("(^"+sep+")"+value+"($"+sep+")");
				if (re.test(elmt.getAttribute(name))) return elmt;
			}
		}
		return null;
	},

	getAnchorElementByItemId: function(target, itemId) {
		var container = ["menuitem", "menu", "toolbarbutton"].indexOf(target.tagName) != -1 ? target.parentNode : target;
		for (var i = 0; i < container.childNodes.length; i++) {
			var elmt = container.childNodes[i];
			if (elmt._placesNode && (elmt._placesNode.itemId == itemId)) {
				return elmt;
			}
		}
		return target;
	},

	closePopups: function(elmt) {
		while (elmt) {
			if (elmt.hidePopup) elmt.hidePopup();
			elmt = elmt.parentNode;
		}
	},

	getPopupOwnerElement: function(elmt) {
		var exists = { "menupopup": true, "popup": true };
		while (elmt && elmt.parentNode) {
			if (!exists[elmt.tagName] && !exists[elmt.parentNode.tagName]) break;
			elmt = elmt.parentNode;
		}
		return elmt;
	},

	getInsertionPoint: function(aNode, forceInsideFolder) {
		var ip;
		if (aNode) {
			var isContainer = PlacesUtils.nodeIsFolder(aNode) || PlacesUtils.nodeIsQuery(aNode);
			if (isContainer && forceInsideFolder) {
				ip = { node: aNode,
						index: (abHere2.isInsertTop ? 0 : -1) };
			} else {
				ip = { node: aNode.parent || aNode, //XXX: aNode.parent = null: when right click on bookmarks toolbar space
						index: aNode.bookmarkIndex };
			}
		}
		return ip;
	},

	getInsertionPointDetails: function(target) {
		var ip;
		switch(target.ownerDocument.documentElement.id)
		{
			case "bookmarksPanel":
				var tree = target.ownerDocument.getElementsByTagName("tree")[0];
				ip = abHere2.getInsertionPoint(tree.selectedNode, true);
				if (ip) ip.anchor = getBrowser().selectedBrowser;
				break;

			case "main-window":
				var owner = abHere2.getPopupOwnerElement(target);
				if ((owner.id == "mainPopupSet") && (document.popupNode instanceof XULElement)) {
					// click ABH from context menu
					target = document.popupNode;
					var _insideFolder = Preferences.get("extensions.abhere2.folder.insideFolder", false);
					ip = abHere2.getInsertionPoint(target._placesNode, _insideFolder);
				} else {
					// click ABH from menu
					ip = { node: target._placesNode, index: (abHere2.isInsertTop ? 0 : -1) };
				}
				if (ip) ip.anchor = abHere2.getPopupOwnerElement(target);
				break;
		}
		return ip;
	},

	getTagByFolderName: function(aFolderItemId) {
		var s = PlacesUtils.bookmarks.getItemTitle(aFolderItemId);
		// remove the ASCII special chars. http://ascii-table.com/
		s = s.replace(/^[\s\x21-\x2F\x3A-\x40\x5B-\x60\x7B-\x7F]*/,"").replace(/[\s\x21-\x2F\x3A-\x40\x5B-\x60\x7B-\x7F]*$/,"");
		return s.length ? [s] : [];
	},

	clickBookmarkHere: function(event) {
		if (event.which == 1) return; // event.which = [ 0: oncommand | 1: onclick(left) | 2: onclick(middle) | 3: onclick(right) ]
		if (!event.originalTarget) return;

		// click on ABH menuitem ?
		var isABH = event.originalTarget.classList.contains("abhere-menuitem");

		// get target node
		var target = isABH ? (event.originalTarget.parentNode || event.originalTarget._parentNode) : event.originalTarget;
		if (!target) return;

		// get insertionPoint details
		var ip = abHere2.getInsertionPointDetails(target);
		var aNode = ip.node;
		var aIndex = ip.index;
		var aShowEditUI = ip.anchor;
		var aItemId = PlacesUtils.getConcreteItemId(ip.node);

		// close all popup menus
		abHere2.closePopups(document.popupNode);
		abHere2.closePopups(event.originalTarget);

		// implement autoTagFolder feature
		var _autoTagFolder = (!PlacesUtils.isRootItem(aItemId)) && Preferences.get("extensions.abhere2.folder.autoTagFolder", false);
		var aTags = (_autoTagFolder || PlacesUtils.nodeIsTagQuery(aNode)) ? abHere2.getTagByFolderName(aItemId) : [];

		// if click on a tag folder, redirect to unsortedBookmarkFolder
		if (PlacesUtils.nodeIsTagQuery(aNode)) {
			aItemId = abHere2.unsortedBookmarksFolderId;
			aIndex = (abHere2.isInsertTop ? 0 : -1);
		}

		var aBrowser = getBrowser().selectedBrowser;

		// ready to implement the clicking feature
		var button = (event.button ? event.button : 0);
		var action = isABH ?
		             Preferences.get("extensions.abhere2.clicking."+["left","middle","right"][button], button) :
		             Preferences.get("extensions.abhere2.folder.middleClick", 0) - 1;
		switch(action) {
		case 0: // show EditBookmarkUI
			if (aTags.length) {
				StarUI.beginBatch();
				PlacesCommandHook.bookmarkPage(aBrowser, aItemId, aShowEditUI, aIndex);
				abHere2.tagURIs([aBrowser.currentURI], aTags);
			}
			PlacesCommandHook.bookmarkPage(aBrowser, aItemId, aShowEditUI, aIndex);
			break;
		case 1: // without EditBookmarkUI
			var isBookmarked = (PlacesUtils.getMostRecentBookmarkForURI(aBrowser.currentURI) != -1);
			if (isBookmarked) {
				if (aTags.length) abHere2.tagURIs([aBrowser.currentURI], aTags);
				else PlacesCommandHook.bookmarkPage(aBrowser, aItemId, true, aIndex);
			} else {
				PlacesCommandHook.bookmarkPage(aBrowser, aItemId, false, aIndex);
				if (aTags.length) abHere2.tagURIs([aBrowser.currentURI], aTags);
				else abHere2.saveBookmarkFolderId(aItemId);
			}
			break;
		case 2: // show AddMultiBookmarkUI
			var aTabInfoList = abHere2.getUniqueTabInfo(aTags);
			var aInsertionPoint = new InsertionPoint(aItemId, aIndex);
			var info = {
				action: "add",
				type: "bookmarks",
				hiddenRows: [],
				defaultInsertionPoint: aInsertionPoint,
				tabInfoList: aTabInfoList
			};
			PlacesUIUtils.showBookmarkDialog(info, window, true);
			break;
		}
		event.preventDefault();
	},

	handleMiddleClickFolder: function(event) {
		if (event.button != 1) return false;
		if (Preferences.get("extensions.abhere2.folder.middleClick", 0) == 0) return false;
		abHere2.clickBookmarkHere(event);
		return true;
	},

	tagURIs: function(aURIList, aTags) {
		for (var i = 0; i < aURIList.length; i++) {
			var txn = new PlacesTagURITransaction(aURIList[i], aTags);
			PlacesUtils.transactionManager.doTransaction(txn);
		}
	},

	get placeContextSortByNameChecked() {
		var elmt = document.getElementById("placesContext_sortBy:name");
		return elmt ? (elmt.getAttribute('checked') ? true : false) : null;
	},
	set placeContextSortByNameChecked(checked) {
		var elmt = document.getElementById("placesContext_sortBy:name");
		if (elmt) elmt.setAttribute('checked', checked ? true : false);
	},

	getAnnoIsFolderSortByName: function(itemId) {
		return PlacesUtils.annotations.itemHasAnnotation(itemId, 'abhere2/sortByName')
			&& PlacesUtils.annotations.getItemAnnotation(itemId, 'abhere2/sortByName');
	},
	setAnnoIsFolderSortByName: function(itemId, isSortByName) {
		if (isSortByName) {
			PlacesUtils.annotations.setItemAnnotation(itemId, 'abhere2/sortByName', true, 0, Ci.nsIAnnotationService.EXPIRE_NEVER);
		} else {
			PlacesUtils.annotations.removeItemAnnotation(itemId, 'abhere2/sortByName');
		}
	},

	nodeIsReadOnly: function(node) {
		return PlacesUtils.nodeIsFolder(node) && PlacesUIUtils.isContentsReadOnly(node); // Firefox36+
	},

	trySortFolderByName: function(itemId) {
		var sorted = abHere2.getAnnoIsFolderSortByName(itemId);
		if (sorted) {
			var txn = new PlacesSortFolderByNameTransaction(itemId);
			PlacesUtils.transactionManager.doTransaction(txn);
		}
	},

	getUniqueTabInfo: function(aTags) {
		var tabList = [];
		var seenURIs = [];

		var _ignorePinnedTabs = Preferences.get("extensions.abhere2.misc.ignorePinned", true);
		var tabs = getBrowser().tabContainer.childNodes;
		for (var i = 0; i < tabs.length; i++) {
			if (tabs[i].hidden) continue;
			if (_ignorePinnedTabs && tabs[i].pinned) continue;
			var webNav = tabs[i].linkedBrowser.webNavigation;
			var uri = webNav.currentURI;
			var title = webNav.document.title || uri.spec;

			if (uri.spec in seenURIs) continue;
			seenURIs[uri.spec] = true;

			tabList.push({ uri:uri, title:title, tags:aTags });
		}
		return tabList;
	},

	moveOpTabsAndHomePageItems: function(target) {
		var sprtor = target._endOptSeparator;
		var ophome = target._endOptOpenSiteURI;
		var optabs = target._endOptOpenAllInTabs;

		if (sprtor) target.removeChild(sprtor);
		if (ophome) target.removeChild(ophome);
		if (optabs) target.removeChild(optabs);

		var cc = target._placesNode.childCount;
		var _hideOptabs = (cc < 2) || (optabs == null) || (optabs && (Preferences.get("extensions.abhere2.position.optabs", 2) == 0));
		var _hideOphome = (cc < 2) || (ophome == null) || (ophome && (Preferences.get("extensions.abhere2.position.ophome", 2) == 0));
		if (optabs) optabs.collapsed = _hideOptabs;
		if (ophome) ophome.collapsed = _hideOphome;
		if (sprtor) sprtor.collapsed = (_hideOptabs && _hideOphome);

		var _top = (Preferences.get("extensions.abhere2.position.optabs", 2) == 1);
		if (sprtor) sprtor.setAttribute("builder", _top ? "start" : "end");
		if (sprtor) target.insertBefore(sprtor, _top ? target.firstChild : null);
		if (ophome) target.insertBefore(ophome, _top ? target.firstChild : null);
		if (optabs) target.insertBefore(optabs, _top ? target.firstChild : null);
	},

	createAddBookmarkHereItems: function(target) {
		var node = target._placesNode;
		if (!node) return;
		if (abHere2.nodeIsReadOnly(node)) return;
		if (!PlacesUtils.nodeIsFolder(node) && !PlacesUtils.nodeIsTagQuery(node)) return;

		var abhere = abHere2.get1stElementByAttribute(target, "class", "abhere-menuitem");
		var sprtor = abHere2.get1stElementByAttribute(target, "class", "abhere-separator");

		if (abhere) target.removeChild(abhere);
		else {
			abhere = document.createElement("menuitem");
			abhere.setAttribute("label", abHere2.strBundle.GetStringFromName("label"));
			//abhere.setAttribute("accesskey", abHere2.strBundle.GetStringFromName("accesskey"));
			abhere.setAttribute("class", "abhere-menuitem");
			abhere.setAttribute("onclick", "abHere2.clickBookmarkHere(event);");
			abhere.setAttribute("oncommand", "abHere2.clickBookmarkHere(event);");
		}
		if (sprtor) target.removeChild(sprtor);
		else {
			sprtor = document.createElement("menuseparator");
			sprtor.setAttribute("class", "abhere-separator");
		}

		if (abhere && Preferences.get("extensions.abhere2.misc.showIconic", true)) {
			abhere.classList.add("menuitem-iconic");
		} else {
			abhere.classList.remove("menuitem-iconic");
		}

		var _hideAbhere = (abhere == null) || (abhere && (Preferences.get("extensions.abhere2.position.abhere", 1) == 0));
		if (abhere) abhere.collapsed = _hideAbhere;
		if (sprtor) sprtor.collapsed = _hideAbhere;

		var _top = (Preferences.get("extensions.abhere2.position.abhere", 1) == 1);
		if (sprtor) sprtor.setAttribute("builder", _top ? "start" : "end");
		if (sprtor) target.insertBefore(sprtor, _top ? target.firstChild : null);
		if (abhere) target.insertBefore(abhere, _top ? target.firstChild : null);
		if (abhere) abhere._parentNode = target;
	},

	controlBookmarksMenuPopups: function(target) {
		var bmcurpage = abHere2.get1stElementByAttribute(target, "key", "addBookmarkAsKb");
		if (bmcurpage) bmcurpage.collapsed = !Preferences.get("extensions.abhere2.bmsmenu.bmcurpage", true);

		var bmalltabs = abHere2.get1stElementByAttribute(target, "key", "bookmarkAllTabsKb");
		if (bmalltabs) bmalltabs.collapsed = !Preferences.get("extensions.abhere2.bmsmenu.bmalltabs", true);

		var showallbm = abHere2.get1stElementByAttribute(target, "key", "manBookmarkKb");
		if (showallbm) showallbm.collapsed = !Preferences.get("extensions.abhere2.bmsmenu.showallbm", true);

		var sbsc2item = abHere2.get1stElementByAttribute(target, "observes", "singleFeedMenuitemState");
		if (sbsc2item) sbsc2item.collapsed = !Preferences.get("extensions.abhere2.bmsmenu.subscribe", true);

		var sbsc2menu = abHere2.get1stElementByAttribute(target, "observes", "multipleFeedsMenuState");
		if (sbsc2menu) sbsc2menu.collapsed = !Preferences.get("extensions.abhere2.bmsmenu.subscribe", true);

		var viewbmbar = abHere2.get1stElementByAttribute(target, "id", "BMB_viewBookmarksToolbar");
		if (viewbmbar) viewbmbar.collapsed = !Preferences.get("extensions.abhere2.bmsmenu.viewbmbar", true);

		var bmtoolbar = abHere2.get1stElementByAttribute(target, "id", "BMB_bookmarksToolbar") || abHere2.get1stElementByAttribute(target, "id", "bookmarksToolbarFolderMenu");
		if (bmtoolbar) bmtoolbar.collapsed = !Preferences.get("extensions.abhere2.bmsmenu.bmtoolbar", true);

		var unsrtmenu = abHere2.get1stElementByAttribute(target, "id", "BMB_unsortedBookmarks") || abHere2.get1stElementByAttribute(target, "id", "menu_unsortedBookmarks");
		if (unsrtmenu) unsrtmenu.collapsed = !Preferences.get("extensions.abhere2.bmsmenu.unsrtmenu", true);
		if (unsrtmenu) unsrtmenu.previousSibling.collapsed = unsrtmenu.collapsed;

		var addbmhere = abHere2.get1stElementByAttribute(target, "class", "abhere-menuitem");
		if (addbmhere) { target.removeChild(addbmhere); addbmhere = null; }
		if (Preferences.get("extensions.abhere2.bmsmenu.addbmhere", false)) {
			var _icon = Preferences.get("extensions.abhere2.misc.showIconic", true);
			addbmhere = document.createElement("menuitem");
			addbmhere.setAttribute("label", abHere2.strBundle.GetStringFromName("label"));
			addbmhere.setAttribute("accesskey", abHere2.strBundle.GetStringFromName("accesskey"));
			addbmhere.setAttribute("class", (_icon ? "menuitem-iconic " : "") + "abhere-menuitem");
			addbmhere.setAttribute("onclick", "abHere2.clickBookmarkHere(event);");
			addbmhere.setAttribute("oncommand", "abHere2.clickBookmarkHere(event);");
			target.insertBefore(addbmhere, bmcurpage ? bmcurpage : target.firstChild);
			addbmhere._parentNode = target;
		}

		// hide unnecessary menuseparators
		var collapsed = true;
		for (var i = 0; i < target.childNodes.length; i++) {
			var elmt = target.childNodes[i];
			if (elmt._placesNode) break;
			if (elmt.tagName == "menuseparator") {
				elmt.collapsed = collapsed;
				collapsed = true;
			} else {
				collapsed = collapsed && elmt.collapsed;
			}
		}
	},

	onpopupBookmarksMenu: function(event) {
		var target = event.originalTarget;
		var node = target._placesNode;
		switch (node ? node.uri : "") {
			case "":
			case "place:folder=BOOKMARKS_MENU":
				//*** control hidden/show of BookmarksMenu's menuitems
				abHere2.controlBookmarksMenuPopups(target);
				break;
			case "place:folder=TOOLBAR":
				if (target.parentNode.classList.contains("chevron")) break;
			default:
				var _top = (Preferences.get("extensions.abhere2.position.abhere", 1) == 1);
				if (_top) {
					abHere2.moveOpTabsAndHomePageItems(target);
					abHere2.createAddBookmarkHereItems(target);
				} else {
					abHere2.createAddBookmarkHereItems(target);
					abHere2.moveOpTabsAndHomePageItems(target);
				}
		}
	},

	oncloseBookmarksMenu: function(event) {
		var bmABH = abHere2.get1stElementByAttribute(event.originalTarget, "class", "abhere-menuitem");
		if (bmABH) event.originalTarget.removeChild(bmABH);
	},

	onpopupBookmarksContextMenu: function(event) {
		if (event.originalTarget.id != "placesContext") return;
		var isEnabled = Preferences.get("extensions.abhere2.context.addbmhere", true);
		if (isEnabled) {
			var ip = abHere2.getInsertionPointDetails(event.originalTarget);
			if (ip && ip.node && !abHere2.nodeIsReadOnly(ip.node)) {
				var _icon = Preferences.get("extensions.abhere2.misc.showIconic", true);
				var bmNew = event.originalTarget.ownerDocument.getElementById("placesContext_new:bookmark");
				var bmABH = document.createElement("menuitem");
				bmABH.setAttribute("id", "placesContext_new:addbookmarkhere");
				bmABH.setAttribute("label", abHere2.strBundle.GetStringFromName("label"));
				bmABH.setAttribute("accesskey", abHere2.strBundle.GetStringFromName("accesskey"));
				bmABH.setAttribute("class", (_icon ? "menuitem-iconic " : "") + "abhere-menuitem");
				bmABH.setAttribute("onclick", "window.top.abHere2.clickBookmarkHere(event);");
				bmABH.setAttribute("oncommand", "window.top.abHere2.clickBookmarkHere(event);");
				event.originalTarget.insertBefore(bmABH, bmNew);
				bmABH._parentNode = event.originalTarget;
			}
		}
		// update "placesContext_sortBy:name" menuitem's checked status
		var itemId = PlacesUtils.getConcreteItemId(document.popupNode._placesNode);
		abHere2.placeContextSortByNameChecked = abHere2.getAnnoIsFolderSortByName(itemId);
	},

	oncloseBookmarksContextMenu: function(event) {
		if (event.originalTarget.id != "placesContext") return;
		var bmABH = event.originalTarget.ownerDocument.getElementById("placesContext_new:addbookmarkhere");
		if (bmABH) event.originalTarget.removeChild(bmABH);
	},

	saveBookmarkFolderId: function(folderId) {
		abHere2.prefBookmarkFolderId = folderId;
	},

	getMostRecentLivemarkFolderId: function() {
		var folderIds = PlacesUtils.annotations.getItemsWithAnnotation(LAST_USED_ANNO, {});
		var folderId = PlacesUtils.toolbarFolderId;
		var lastUsedMax = 0;
		for (var i = 0; i < folderIds.length; i++) {
			var lastUsed = PlacesUtils.annotations.getItemAnnotation(folderIds[i], LAST_USED_ANNO);
			if (lastUsed > lastUsedMax) {
				lastUsedMax = lastUsed;
				folderId = folderIds[i];
			}
		}
		return folderId;
	},

	expandRow: function(aRow) {
		aRow.nextSibling.collapsed = false;
		var expander = aRow.getElementsByTagName("button")[0];
		if (expander) {
			expander.className = "expander-up";
			expander.setAttribute("tooltiptext", expander.getAttribute("tooltiptextup"));
		}
	},

	expandRows: function(self) {
		if (StarUI._isDockOnStar ? Preferences.get("extensions.abhere2.starUI.expand.folderRow", true) : StarUI._isBookmarked) {
			var aRow = self._element("folderRow");
			if (!aRow.collapsed) {
				abHere2.expandRow(aRow);
				self._element("newFolderBox").collapsed = false;
				self._element("chooseFolderSeparator").hidden = self._element("chooseFolderMenuItem").hidden = true;
				const FOLDER_TREE_PLACE_URI = "place:excludeItems=1&excludeQueries=1&excludeReadOnlyFolders=1&folder="+PlacesUIUtils.allBookmarksFolderId;
				self._folderTree.place = FOLDER_TREE_PLACE_URI;
				setTimeout(function(self) {
					if (self._itemId != -1) {
						self._folderTree.place = FOLDER_TREE_PLACE_URI;
						self._folderTree.selectItems([PlacesUtils.bookmarks.getFolderIdForItem(self._itemId)]);
						self._folderTree.boxObject.ensureRowIsVisible(self._folderTree.view.selection.currentIndex);
					}
				}, 250, self);
			}
		}
		if (Preferences.get("extensions.abhere2.starUI.expand.tagsRow", true)) {
			var aRow = self._element("tagsRow");
			if (!aRow.collapsed) {
				abHere2.expandRow(aRow);
				self._rebuildTagsSelectorList();
				aRow.nextSibling.addEventListener("CheckboxStateChange", gEditItemOverlay, false);
			}
		}
	},

	removeBookmarksForCurrentPage: function() {
		var itemIds = PlacesUtils.getBookmarksForURI(getBrowser().currentURI);
		for (var i = 0; i < itemIds.length; i++) {
			var txn = new PlacesRemoveItemTransaction(itemIds[i]);
			PlacesUtils.transactionManager.doTransaction(txn);
		}
	},

	handleStarButtonClick: function(event) {
		var button = (event.button ? event.button : 0);
		var action = Preferences.get("extensions.abhere2.starUI.clicking."+["left","middle","right"][button], 0);
		if (action & 8) {
			switch (action) {
				case 8: // open the ABH2 options dialog
					window.openDialog("chrome://abhere2/content/prefsDialog.xul", "abHere2Prefs", "chrome,centerscreen,dependent,toolbar");
					return true;
				case 9: // open the Library window
					PlacesCommandHook.showPlacesOrganizer('AllBookmarks');
					return true;
			}
		} else {
		    var target = event.currentTarget.hasAttribute("anonid") ? event.currentTarget.parentNode : event.currentTarget;
			var _starred = (target.getAttribute("starred") == "true");
			if (action & 1) { // do remove all bookmarks for current URI
				if (_starred) {
					abHere2.removeBookmarksForCurrentPage();
					return true;
				}
			}
			if (action & 2) { // do bookmark current page to the unsorted bookmarks folder
				PlacesCommandHook.bookmarkCurrentPage(_starred);
				return true;
			}
			if (action & 4) { // do bookmark current page with a single click
				PlacesCommandHook.bookmarkCurrentPage(true);
				return true;
			}
		}
		return false;
	},

	onpopupToolbarContextMenu: function(event) {
		if (event.originalTarget.id != "toolbar-context-menu") return;
		// prevent context menu popup if user assigned action to star-button's right-click event
		if (document.popupNode.id == "star-button") {
			var action = Preferences.get("extensions.abhere2.starUI.clicking.right", 0);
			if (action) event.preventDefault();
		}
	},

	createResizer: function(aBoxId) {
		var id = "editBMPanel_"+aBoxId+"Resizer";
		var resizer = document.getElementById(id);
		if (resizer) return;
		resizer = document.createElement("speacer");
		resizer.id = id;
		resizer.height = "3";
		resizer.onmouseover = function(){ this.style.cursor = "s-resize"; };

		var box = document.getElementById("editBMPanel_"+aBoxId);
		if (box.parentNode.tagName != "vbox") {
			box.parentNode.insertBefore(document.createElement("vbox"), box).appendChild(box);
		}
		box.parentNode.insertBefore(resizer, box.nextSibling);
		box.style.marginBottom = "0px";

		var panel = document.getElementById("editBookmarkPanel");
		panel.addEventListener("mousedown", function(e) {
			if (e.target == resizer) {
				box.isDrag = true;
				box.clientY = e.clientY;
			}
		}, false);
		panel.addEventListener("mousemove", function(e) {
			if (box.isDrag) {
				var boxHeight = abHere2.getBoxHeight(aBoxId);
				box.height = boxHeight + (e.clientY - box.clientY);
			}
		}, false);
		panel.addEventListener("mouseup", function(e) {
			if (box.isDrag) {
				box.isDrag = false;
				var boxHeight = (box.height < 0 ? 0 : box.height);
				abHere2.setBoxHeight(aBoxId, boxHeight);
			}
		}, false);
	},

	getDescriptionFromSelectionText: function() {
		if (Preferences.get("extensions.abhere2.starUI.row.description", true)) {
			var maxLength = Preferences.get("extensions.abhere2.starUI.row.description.maxLength", 150);
			return document.commandDispatcher.focusedWindow.getSelection().toString().trim().substring(0, maxLength);
		} else {
			return "";
		}
	},

	init: function() {
		//*** implement "fill selected text in description" feature
		abHere2.hookFunc(PlacesCommandHook, "bookmarkPage",
			'PlacesUIUtils.getDescriptionFromDocument(webNav.document);',
			'abHere2.getDescriptionFromSelectionText() || $&');

		//*** fix failed to assign textbox value on initial
		abHere2.hookFunc(gEditItemOverlay, "_initTextField",
			'field.value = aValue',
			'field.setAttribute("value", $&)');

		//*** implement sortFolderByName feature
		//when check/uncheck the folder's sortByName menuitem, save the checked status using nsIAnnotationService
		abHere2.hookFunc(PlacesController.prototype, "sortFolderByName",
			"var itemId = PlacesUtils.getConcreteItemId(this._view.selectedNode);",
			"$& var checked = abHere2.placeContextSortByNameChecked; abHere2.setAnnoIsFolderSortByName(itemId, checked); if (!checked) return;");

		//if folder's sortByName is checked, sort folder by name after bookmark a page
		abHere2.hookFunc(PlacesCommandHook, "bookmarkPage",
			"PlacesUtils.transactionManager.doTransaction(txn);",
			"$& if (typeof(aShowEditUI)=='object' && StarUI._batching) abHere2.trySortFolderByName(aParent);");

		//*** implement insertTop feature
		//decide insert position when user bookmark a page
		abHere2.hookFunc(PlacesCommandHook, "bookmarkPage",
			"PlacesUtils.bookmarks.DEFAULT_INDEX",
			"(typeof(arguments[3])=='number') ? arguments[3] : (abHere2.isInsertTop ? 0 : -1)");

		//decide insert position when user select folder on editBookmark UI
		abHere2.hookFunc(gEditItemOverlay, "onFolderMenuListCommand",
			"PlacesUtils.bookmarks.DEFAULT_INDEX",
			"(abHere2.isInsertTop ? 0 : -1)");

		//decide insert position when user drop a bookmark or folder
		abHere2.hookFunc(PlacesControllerDragHelper, "onDrop",
			/{/,
			"$& if (insertionPoint.orientation == Ci.nsITreeView.DROP_ON) { if (abHere2.isInsertTop) insertionPoint.index = 0; }");

		//*** implement anchorPopup feature
		//decide bookmarkEditor popup position
		abHere2.hookFunc(PlacesCommandHook, "bookmarkPage",
			"if (BookmarkingUI.anchor) {",
			"var anchor = (typeof(aShowEditUI)=='object' && StarUI._batching) ? abHere2.getAnchorElementByItemId(aShowEditUI, itemId) : BookmarkingUI.anchor;" +
			"if (anchor) {");

		abHere2.hookFunc(PlacesCommandHook, "bookmarkPage",
			"StarUI.showEditBookmarkPopup(itemId, BookmarkingUI.anchor,",
			"StarUI.showEditBookmarkPopup(itemId, anchor, (typeof(aShowEditUI)=='object' && StarUI._batching) ? 'after_pointer' : ");

		//*** fix display problem on PlacesViewBase.prototype.nodeInserted()
		abHere2.hookFunc(PlacesViewBase.prototype, "nodeInserted",
			/}$/,
			"this._mayAddCommandsItems(parentElt); abHere2.moveOpTabsAndHomePageItems(parentElt); $&");
		//*** fix display problem on PlacesViewBase.prototype.nodeRemoved()
		abHere2.hookFunc(PlacesViewBase.prototype, "nodeRemoved",
			"parentElt.removeChild(elt);",
			"$& abHere2.moveOpTabsAndHomePageItems(parentElt);");

		//*** move openintabs & openhomepage, add addbookmarkhere, control hidden/show of BookmarksMenu's menuitems
		abHere2.hookFunc(PlacesViewBase.prototype, "_onPopupShowing",
			"this._mayAddCommandsItems(popup);",
			"$& abHere2.onpopupBookmarksMenu(aEvent);");

		//*** implement folder.middleClick feature
		abHere2.hookFunc(BookmarksEventHandler, "onClick",
			"PlacesUIUtils.openContainerNodeInTabs",
			"if (!abHere2.handleMiddleClickFolder(aEvent)) $&");

		//*** implement folderId.bookmark feature
		//decide folderId when user bookmark current page
		abHere2.hookFunc(PlacesCommandHook, "bookmarkCurrentPage",
			"aParent,",
			"aShowEditUI ? abHere2.prefBookmarkFolderId : aParent,");

		//remember last selected folder when user press [ENTER] to bookmark a page
		abHere2.hookFunc(StarUI, "handleEvent",
			"this.panel.hidePopup();",
			"$& abHere2.saveBookmarkFolderId(gEditItemOverlay._getFolderIdFromMenuList());");

		//remember last selected folder when user click [Done] to bookmark a page
		var btn = document.getElementById("editBookmarkPanelDoneButton");
		if (btn) btn.setAttribute("oncommand", btn.getAttribute("oncommand")+"abHere2.saveBookmarkFolderId(gEditItemOverlay._getFolderIdFromMenuList());");

		//*** implement folderId.livemark feature
		//decide folderId when user add a livemark
		abHere2.hookFunc(PlacesCommandHook, "addLiveBookmark",
			"var toolbarIP = new InsertionPoint(PlacesUtils.toolbarFolderId, -1);",
			"var aItemId = abHere2.prefLivemarkFolderId; var toolbarIP = new InsertionPoint(aItemId, abHere2.isInsertTop ? 0 : -1);");

		//remember last selected folder when user click [Done] to add a livemark
		abHere2.hookFunc(PlacesCommandHook, "addLiveBookmark",
			/PlacesUIUtils.showBookmarkDialog\([^]*\)/,
			"if ($&) abHere2.prefLivemarkFolderId = abHere2.getMostRecentLivemarkFolderId()");

		//*** implement folderId.unsorted feature
		//redirect the unsortedBookmarksFolder if user want to customize it
		abHere2.hookFunc(PlacesCommandHook, "bookmarkPage",
			"PlacesUtils.unfiledBookmarksFolderId",
			"abHere2.unsortedBookmarksFolderId");

		//*** customize editBookmarkPanel each row's hidden/show
		abHere2.hookFunc(StarUI, "_doShowEditBookmarkPanel",
			/hiddenRows: \[[^]*\]/,
			"hiddenRows: abHere2.hiddenRows");

		//*** customize folderTree's height
		abHere2.hookFunc(StarUI, "_doShowEditBookmarkPanel",
			/}$/,
			'this._element("editBMPanel_folderTree").height = abHere2.getBoxHeight("folderTree"); $&');

		//*** customize tagsSelector's height
		abHere2.hookFunc(StarUI, "_doShowEditBookmarkPanel",
			/}$/,
			'this._element("editBMPanel_tagsSelector").height = abHere2.getBoxHeight("tagsSelector"); $&');

		//*** customize descriptionField's height
		abHere2.hookFunc(StarUI, "_doShowEditBookmarkPanel",
			/}$/,
			'this._element("editBMPanel_descriptionField").height = abHere2.getBoxHeight("descriptionField"); $&');

		//*** create folderTree resizer
		abHere2.hookFunc(StarUI, "_doShowEditBookmarkPanel",
			/}$/,
			'abHere2.createResizer("folderTree"); $&');

		//*** create tagsSelector resizer
		abHere2.hookFunc(StarUI, "_doShowEditBookmarkPanel",
			/}$/,
			'abHere2.createResizer("tagsSelector"); $&');

		//*** create descriptionField resizer
		abHere2.hookFunc(StarUI, "_doShowEditBookmarkPanel",
			/}$/,
			'abHere2.createResizer("descriptionField"); $&');

		//*** customize editBookmarkPanel's width
		abHere2.hookFunc(StarUI, "_doShowEditBookmarkPanel",
			/}$/,
			'this._element("editBookmarkPanelGrid").width = abHere2.panelWidth; $&');

		//*** group the tags in line
		abHere2.hookFunc(StarUI, "panelShown",
			/}$/,
			'document.getAnonymousNodes(document.getElementById("editBMPanel_tagsSelector"))[1].lastChild.style.display = (abHere2.isTagsInline ? "inline-block" : ""); $&');

		//*** expand the folderTree & tagsSelector if the bookmark has already existed
		abHere2.hookFunc(StarUI, "_doShowEditBookmarkPanel",
			'this.beginBatch();',
			'this._isDockOnStar = (aAnchorElement.id == "star-button"); this._isBookmarked = !this._batching; $&');
		abHere2.hookFunc(gEditItemOverlay, "_showHideRows",
			/}$/,
			'abHere2.expandRows(this); $&');

		//*** save tagsSelector expander's status
		abHere2.hookFunc(StarUI, "quitEditMode",
			/{/,
			'$& abHere2.isTagsRowExpand = !document.getElementById("editBMPanel_tagsSelectorRow").collapsed;');

		//*** change bookmarkLink() default bookmark to unsortedBookmarkFolder
		PlacesCommandHook.bookmarkLink = function PCH_bookmarkLink(aParent, aURL, aTitle) {
			var linkURI = makeURI(aURL);
			var itemId = PlacesUtils.getMostRecentBookmarkForURI(linkURI);
			if (itemId == -1) {
				var ip = new InsertionPoint(abHere2.unsortedBookmarksFolderId, abHere2.isInsertTop ? 0 : -1);
				var info = { action: "add", type: "bookmark", uri: linkURI, title: aTitle, defaultInsertionPoint: ip };
			} else {
				var info = { action: "show", type: "bookmark", itemId: itemId };
			}
			info.hiddenRows = ["keyword","description","loadInSidebar"];
			PlacesUIUtils.showBookmarkDialog(info, window, true);
		}

		//*** prevent KeyEvent.DOM_VK_RETURN close editBookmarkPanel if the description field is focused
		abHere2.hookFunc(StarUI, "handleEvent",
			'aEvent.target.id == "editBMPanel_newFolderButton"',
			'$& || aEvent.target.id == "editBMPanel_descriptionField"');

		//*** make ensureRowIsVisible when user choose a folder from folderMenuList
		abHere2.hookFunc(gEditItemOverlay, "onFolderMenuListCommand",
			"this._folderTree.selectItems([container]);",
			"$& this._folderTree.boxObject.ensureRowIsVisible(this._folderTree.view.selection.currentIndex);");

		window.addEventListener("load", abHere2.onload, false);
	},

	onload: function() {
		//*** add ToolbarContextMenu's popup event handler
		var tbc = document.getElementById("toolbar-context-menu");
		if (tbc) {
			tbc.addEventListener("popupshowing", abHere2.onpopupToolbarContextMenu, false);
		}

		//*** add BookmarksContextMenu's popup event handler
		var bmc = document.getElementById("placesContext");
		if (bmc) {
			bmc.addEventListener("popupshowing", abHere2.onpopupBookmarksContextMenu, false);
			bmc.addEventListener("popuphiding", abHere2.oncloseBookmarksContextMenu, false);
		}

		//*** add BookmarksMenu's popup event handler
		var bmm = document.getElementById("bookmarksMenuPopup");
		if (bmm) {
			bmm.addEventListener("popuphiding", abHere2.oncloseBookmarksMenu, false);
		}

		//*** fix display problem on command: "Browser:AddBookmarkAs"
		var aba = document.getElementById("Browser:AddBookmarkAs");
		if (aba) aba.setAttribute("oncommand", "setTimeout(function(){"+aba.getAttribute("oncommand")+"},0);");

		//*** fix StarButton's clicking features does not work on Firefox 27+
        var bmmb = document.getElementById("bookmarks-menu-button");
        if (bmmb) bmmb.removeAttribute("oncommand");
        var star = bmmb && document.getAnonymousElementByAttribute(bmmb, 'anonid', 'button') || document.getElementById("star-button");
        if (star) star.setAttribute("onclick", "if (!abHere2.handleStarButtonClick(event)) BookmarkingUI.onCommand(event);");
	}
}
abHere2.init();
