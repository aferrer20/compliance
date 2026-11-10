/* Old links (customer.html, tenant.html) keep their email prefill parameters when forwarded. */
(function () { var s = document.currentScript; if (s) location.replace(s.getAttribute('data-to') + location.search + location.hash); })();
