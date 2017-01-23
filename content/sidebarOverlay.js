window.addEventListener("load", function() {
	var bmc = document.getElementById("placesContext");
	if (bmc) {
		bmc.addEventListener("popupshowing", window.top.abH2me.onpopupBookmarksContextMenu, false);
		bmc.addEventListener("popuphiding", window.top.abH2me.oncloseBookmarksContextMenu, false);
	}
}, false);
