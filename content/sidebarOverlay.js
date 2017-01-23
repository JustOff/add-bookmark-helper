window.addEventListener("load", function() {
	var bmc = document.getElementById("placesContext");
	if (bmc) {
		bmc.addEventListener("popupshowing", window.top.abHere2.onpopupBookmarksContextMenu, false);
		bmc.addEventListener("popuphiding", window.top.abHere2.oncloseBookmarksContextMenu, false);
	}
}, false);
