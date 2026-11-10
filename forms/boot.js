/* Mounts the dossier named by data-form on this script tag (kept external for the CSP). */
(function () {
  var s = document.currentScript, k = s && s.getAttribute('data-form');
  if (k && window.VETTING_SCHEMAS && window.VETTING_SCHEMAS[k]) window.Vetting.mount(window.VETTING_SCHEMAS[k]);
})();
