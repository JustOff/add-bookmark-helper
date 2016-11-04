function onsyncfrompreference(self) {
  var preference = document.getElementById(self.getAttribute("preference"));
  var value = preference.value;
  switch (self.tagName) {
    case "checkbox":
      value = (value == 0 ? false : true);
      break;

    case "tree":
      if (!self.place) {
        self.place = "place:excludeItems=1&excludeQueries=1&excludeReadOnlyFolders=1&folder="+PlacesUIUtils.allBookmarksFolderId;
      }
      if (value == 0) {
        self.disabled = true;
        self.selectItems([]);
      } else {
        self.disabled = false;
        self.selectItems([value]);
        setTimeout(function(){ self.boxObject.ensureRowIsVisible(self.view.selection.currentIndex); }, 0);
      }
      break;
  }
  return value;
}
function onsynctopreference(self) {
  var preference = document.getElementById(self.getAttribute("preference"));
  var value = preference.value;
  switch (self.tagName) {
    case "checkbox":
      value = (self.checked ? PlacesUtils.unfiledBookmarksFolderId : 0);
      break;

    case "tree":
      if (self.selectedNode) value = preference.value = PlacesUtils.getConcreteItemId(self.selectedNode);
      break;
  }
  return value;
}
