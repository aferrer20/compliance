/* GPU buyer / end-user qualification — mirrors the OEM and NVIDIA end-user discovery. */
(function () {
  var Q = window.VQ, yes = Q.yes, no = Q.no;
  var notEU = no('purchaserIsEndUser');
  var shared = function (v) { return ['Multi-tenant cloud', 'Bare-metal rental to third parties'].indexOf(v.tenancy) >= 0 || (v.accessModel && v.accessModel !== 'Internal staff only'); };
  window.VETTING_SCHEMAS.buyer = {
    id: 'buyer', version: 3, prefix: 'GB', entityField: 'legalName',
    title: 'GPU Buyer & End-User Qualification',
    prefill: [['e', 'subEmail'], ['c', 'legalName'], ['ref', 'quoteRef']],
    next: [
      'A named reviewer screens the purchaser, end user, owners, directors and site operator against U.S., UK and EU sanctions and export lists.',
      'We confirm the site and allocated power with the data center operator, and verify funding with the issuing institution.',
      'Your discovery goes to the OEM and NVIDIA for compliance alignment. Once you qualify, you receive pricing, allocation and the purchase documents.'
    ],
    sections: [
      { title: 'The transaction', short: 'Transaction', tag: 'What and how many',
        intro: 'About twenty minutes. Answer for the <b>actual end user</b>, the entity that will run the workloads. Your answers save on this device as you go.',
        fields: [
          { t: 'select', n: 'role', l: 'Your role in this transaction', req: true, full: true, o: ['End user (we will own and operate the systems)', 'Cloud / GPU service provider (capacity for our customers)', 'Reseller or systems integrator buying for an end user', 'Lessor / financier (we will hold title)', 'Advisor or broker acting for a buyer'] },
          { t: 'text', n: 'quoteRef', l: 'Quote or opportunity reference (if any)' },
          { t: 'select', n: 'dealValue', l: 'Estimated transaction value', req: true, o: ['Under $1M', '$1M – $5M', '$5M – $25M', '$25M – $100M', '$100M+'] },
          { t: 'multi', n: 'productFamily', l: 'Product family', req: true, o: ['H100', 'H200', 'B200', 'B300', 'GB200 NVL72', 'GB300 NVL72', 'RTX PRO 6000', 'Other'] },
          { t: 'number', n: 'quantityGpus', l: 'Total GPUs', req: true, ph: 'e.g. 512' },
          { t: 'number', n: 'quantityServers', l: 'Total servers / nodes', ph: 'e.g. 64' },
          { t: 'multi', n: 'oem', l: 'OEM preference', o: ['Dell', 'HPE', 'Supermicro', 'Lenovo', 'Gigabyte', 'ASUS', 'Cisco', 'No preference'] }
        ].concat(Q.submitter) },

      { title: 'Purchasing entity', short: 'Purchaser', tag: 'Checked against the registry',
        fields: [
          { t: 'text', n: 'legalName', l: 'Legal company name', req: true, full: true, ac: 'organization' },
          { t: 'text', n: 'regNumber', l: 'Company registration number', req: true },
          { t: 'text', n: 'taxId', l: 'Tax ID (EIN, VAT or local TIN)', req: true },
          { t: 'country', n: 'countryInc', l: 'Country of incorporation', req: true },
          { t: 'number', n: 'yearInc', l: 'Year incorporated', req: true, ph: 'YYYY' },
          { t: 'area', n: 'regAddress', l: 'Registered address', req: true },
          { t: 'area', n: 'hqAddress', l: 'Headquarters (principal place of business)', req: true },
          { t: 'country', n: 'hqCountry', l: 'Headquarters country', req: true },
          { t: 'url', n: 'website', l: 'Corporate website', req: true, ph: 'https://' },
          { t: 'text', n: 'parentCompany', l: 'Parent company (if any)' },
          { t: 'text', n: 'ultParent', l: 'Ultimate parent company (if any)' },
          { t: 'country', n: 'ultParentCountry', l: 'Country of ultimate parent HQ', req: function (v) { return !!(v.ultParent || '').trim(); } },
          { t: 'text', n: 'duns', l: 'D-U-N-S number' },
          { t: 'text', n: 'lei', l: 'LEI' }
        ] },

      { title: 'Actual end user', short: 'End user', tag: 'OEM discovery 01', numbered: false,
        why: 'NVIDIA and the OEM require the named operating entity that will run the workloads, with its legal name, address and named contacts. This is the single most scrutinised answer in the file.',
        fields: [
          { t: 'yesno', n: 'purchaserIsEndUser', l: 'Is the purchasing company also the end user that will operate the systems?', req: true, full: true },
          { t: 'text', n: 'euName', l: 'End user legal entity name', req: notEU, show: notEU, full: true },
          { t: 'area', n: 'euAddress', l: 'End user registered address', req: notEU, show: notEU },
          { t: 'country', n: 'euCountry', l: 'End user country of incorporation', req: notEU, show: notEU },
          { t: 'url', n: 'euWebsite', l: 'End user website', req: notEU, show: notEU },
          { t: 'country', n: 'euUltParentCountry', l: 'Country of end user ultimate parent', show: notEU },
          { t: 'select', n: 'euRelationship', l: 'Relationship of purchaser to end user', req: notEU, show: notEU, o: ['Customer', 'Affiliate', 'Lessee', 'Tenant of our cloud', 'Other'] },
          { t: 'repeat', n: 'euContacts', l: 'Named end-user contacts', req: true, min: 1, start: 1, max: 5, item: 'Contact', add: 'Add a contact', hint: 'People at the end user we can speak to directly. The OEM requires title, email and phone.',
            fields: [
              { t: 'text', n: 'name', l: 'Name', req: true },
              { t: 'text', n: 'title', l: 'Title', req: true },
              { t: 'email', n: 'email', l: 'Email', req: true },
              { t: 'tel', n: 'phone', l: 'Phone', req: true }
            ] },
          { t: 'sub', l: 'Ultimate offtaker' },
          { t: 'yesno', n: 'hasOfftaker', l: 'Is this capacity being built to serve a specific downstream party that has contracted to take the compute, capacity or output?', req: true, full: true },
          { t: 'text', n: 'offtakerName', l: 'Offtaker legal name', req: yes('hasOfftaker'), show: yes('hasOfftaker') },
          { t: 'country', n: 'offtakerCountry', l: 'Offtaker country of incorporation', req: yes('hasOfftaker'), show: yes('hasOfftaker') },
          { t: 'country', n: 'offtakerUltParentCountry', l: 'Country of offtaker ultimate parent', show: yes('hasOfftaker') },
          { t: 'number', n: 'offtakerShare', l: 'Share of capacity committed (%)', show: yes('hasOfftaker') },
          { t: 'select', n: 'offtakerAgreement', l: 'Nature of the offtake', req: yes('hasOfftaker'), show: yes('hasOfftaker'), o: ['Signed take-or-pay / reserved capacity', 'Signed committed volume', 'Whole-facility offtake', 'Letter of intent only', 'Spot / on-demand', 'Other'] }
        ] },

      { title: 'Funding sources & title', short: 'Funding', tag: 'OEM discovery 02',
        why: 'The OEM asks who is paying, where the funds come from, and which entity will hold title to the equipment. Funds and title that sit with unrelated parties are a classic diversion pattern.',
        fields: [
          { t: 'text', n: 'payor', l: 'Entity that will pay', req: true },
          { t: 'country', n: 'payorCountry', l: 'Payor country', req: true },
          { t: 'multi', n: 'fundingSources', l: 'Sources of funds', req: true, o: ['Cash on balance sheet', 'Equity (VC / PE)', 'Debt facility / bank loan', 'GPU-backed financing or lease', 'Customer prepayment or offtake contract', 'Government grant or programme', 'Other'] },
          { t: 'area', n: 'fundingDetail', l: 'Describe the funding', req: true, hint: 'Name the investors, lenders or lessors and the status of each commitment.' },
          { t: 'text', n: 'financierName', l: 'Lender / lessor name', req: function (v) { return (v.fundingSources || []).some(function (s) { return /Debt|GPU-backed/.test(s); }); }, show: function (v) { return (v.fundingSources || []).some(function (s) { return /Debt|GPU-backed/.test(s); }); } },
          { t: 'country', n: 'fundsCountry', l: 'Country the funds originate from', req: true },
          { t: 'text', n: 'titleHolder', l: 'Entity that will hold title to the equipment', req: true },
          { t: 'yesno', n: 'titleIsEndUser', l: 'Is the title holder the same entity as the end user?', req: true },
          { t: 'yesno', n: 'thirdPartyPay', l: 'Will any party other than the purchaser send payment?', req: true },
          { t: 'select', n: 'pof', l: 'Proof of funds', req: true, o: ['Proof of funds available now', 'Signed financing commitment available', 'Financing in process', 'Not yet available'] }
        ] },

      { title: 'Ownership, management & board', short: 'Ownership', tag: 'OEM requirement',
        why: 'The OEM requires the ownership and management structure, including percentage ownership across related entities, and a list of the board of directors.',
        fields: [
          Q.ubos,
          { t: 'area', n: 'relatedPct', l: 'Ownership across related entities', hint: 'Holding companies, affiliates and the percentage each owns. Attach a chart in Documents if easier.' },
          Q.directors
        ].concat(Q.governance) },

      { title: 'Workloads & software stack', short: 'Workloads', tag: 'OEM discovery 03',
        intro: 'Be specific: the application, the operator and the scale. General descriptions are queried and delay the file.',
        fields: [
          { t: 'area', n: 'workloads', l: 'What will the systems be used for?', req: true, ph: 'e.g. Pre-training a 70B-parameter multilingual LLM for our own products, then serving inference to enterprise customers in the U.S. and EU.' },
          { t: 'multi', n: 'useCategories', l: 'Select all that apply', req: true, o: ['AI training', 'AI inference', 'Fine-tuning', 'HPC / simulation', 'Rendering / media', 'Research', 'Other'] },
          { t: 'area', n: 'models', l: 'Models trained or served', hint: 'Names or families and approximate parameter scale.' },
          { t: 'multi', n: 'orchestration', l: 'Orchestration', req: true, o: ['Kubernetes', 'Slurm', 'NVIDIA Run:ai', 'NVIDIA Base Command / DGX Cloud stack', 'VMware', 'OpenStack', 'Bare metal / none', 'Other'] },
          { t: 'text', n: 'frameworks', l: 'Frameworks and serving stack', full: true, ph: 'PyTorch, JAX, NeMo, TensorRT-LLM, vLLM, Triton…' },
          { t: 'seg', n: 'tenancy', l: 'Tenancy model', req: true, full: true, o: ['Single-tenant, internal use', 'Single-tenant for one named customer', 'Multi-tenant cloud', 'Bare-metal rental to third parties'] },
          { t: 'select', n: 'accessModel', l: 'Who will have access to the compute?', req: true, o: ['Internal staff only', 'Named enterprise customers under contract', 'Self-serve public cloud', 'Mixed'] },
          { t: 'area', n: 'accessCountries', l: 'Every country users will access the systems from', req: true },
          { t: 'yesno', n: 'downstreamKyc', l: 'Do you run KYC and denied-party screening on every customer before granting access?', req: shared, show: shared, full: true },
          { t: 'text', n: 'kycTool', l: 'Screening tool or provider used', req: function (v) { return shared(v) && v.downstreamKyc === 'Yes'; }, show: function (v) { return shared(v) && v.downstreamKyc === 'Yes'; } }
        ] },

      { title: 'Networking topology', short: 'Network', tag: 'OEM discovery 04',
        intro: 'A summary is fine. Your network architect can refine it later.',
        fields: [
          { t: 'select', n: 'fabric', l: 'Compute fabric', req: true, o: ['InfiniBand (NDR / XDR)', 'NVIDIA Spectrum-X Ethernet', 'Other RoCE Ethernet', 'Standard Ethernet', 'Not yet designed'] },
          { t: 'text', n: 'bandwidth', l: 'Per-GPU / per-node bandwidth', ph: 'e.g. 400 Gb/s per GPU, rail-optimized' },
          { t: 'area', n: 'topology', l: 'Switching and interconnect', req: true, hint: 'Leaf / spine, rail design, oversubscription, storage network.' },
          { t: 'area', n: 'segmentation', l: 'Segmentation and isolation', hint: 'Tenant isolation, out-of-band and BMC management networks.' },
          { t: 'area', n: 'externalConn', l: 'External connectivity', hint: 'Carriers, upstream bandwidth, public exposure.' },
          { t: 'area', n: 'remoteMgmt', l: 'Remote management', req: true, hint: 'Who administers the systems remotely, and from which countries.' }
        ] },

      { title: 'Data center & colocation', short: 'Site', tag: 'OEM discovery 05',
        why: 'The OEM needs the exact site, the operator contacts and the lease or hosting contract. We confirm allocated power directly with the operator, and any attestation must come from the operator, not the buyer.',
        fields: [
          { t: 'text', n: 'dcName', l: 'Facility name', req: true },
          { t: 'text', n: 'dcOperator', l: 'Operator / owner', req: true },
          { t: 'area', n: 'dcAddress', l: 'Full installation address', req: true },
          { t: 'country', n: 'dcCountry', l: 'Installation country', req: true },
          { t: 'select', n: 'dcContract', l: 'Hosting contract status', req: true, o: ['Signed lease / colocation agreement', 'Signed LOI or term sheet', 'In negotiation', 'Not yet engaged'] },
          { t: 'text', n: 'dcContractRef', l: 'Contract reference', show: function (v) { return /^Signed/.test(v.dcContract || ''); } },
          { t: 'text', n: 'dcContactName', l: 'Operator contact name', req: true },
          { t: 'email', n: 'dcContactEmail', l: 'Operator contact email', req: true },
          { t: 'tel', n: 'dcContactPhone', l: 'Operator contact phone', req: true },
          { t: 'select', n: 'facilityType', l: 'Facility type', req: true, o: ['Single-tenant facility', 'Multi-tenant colocation', 'Hyperscale campus', 'Modular / containerised', 'Other'] },
          { t: 'number', n: 'facilityMW', l: 'Total facility power (MW)' },
          { t: 'number', n: 'allocatedMW', l: 'Power allocated to this deployment (MW)', req: true, hint: 'What the operator has committed to you.' },
          { t: 'number', n: 'itLoadMW', l: 'Estimated IT load of this order (MW)' },
          { t: 'select', n: 'cooling', l: 'Cooling', req: true, o: ['Air', 'Direct liquid cooling', 'Rear-door heat exchangers', 'Immersion', 'Hybrid'] },
          { t: 'yesno', n: 'exclusiveControl', l: 'Will the end user retain exclusive operational control of the equipment at this site?', req: true, full: true },
          { t: 'yesno', n: 'entityInCountry', l: 'Does the end user have a registered legal entity in the installation country?', req: true, full: true },
          { t: 'yesno', n: 'thirdPartyAccess', l: 'Will any third party have physical or administrative access to the equipment?', req: true, full: true },
          { t: 'text', n: 'tpName', l: 'Third party legal name', req: yes('thirdPartyAccess'), show: yes('thirdPartyAccess') },
          { t: 'country', n: 'tpCountry', l: 'Third party country', req: yes('thirdPartyAccess'), show: yes('thirdPartyAccess') },
          { t: 'multi', n: 'tpAccess', l: 'Nature of access', req: yes('thirdPartyAccess'), show: yes('thirdPartyAccess'), o: ['Physical access (remote hands)', 'Logical / administrative access', 'Managed infrastructure services', 'Facility operator only'] },
          { t: 'yesno', n: 'singleSite', l: 'Will all equipment be installed at this single address?', req: true, full: true },
          { t: 'area', n: 'otherSites', l: 'List every other site, with power allocated at each', req: no('singleSite'), show: no('singleSite') },
          { t: 'yesno', n: 'dcAttestation', l: 'Will the operator sign a data center attestation and send it to us directly?', req: true, full: true }
        ] },

      { title: 'Deployment & rollout schedule', short: 'Schedule', tag: 'OEM discovery 06',
        fields: [
          { t: 'repeat', n: 'phases', l: 'Rollout by phase', req: true, min: 1, start: 1, max: 8, item: 'Phase', add: 'Add a phase',
            fields: [
              { t: 'text', n: 'name', l: 'Phase', req: true, ph: 'Phase 1' },
              { t: 'number', n: 'gpus', l: 'GPUs', req: true },
              { t: 'date', n: 'delivery', l: 'Delivery', req: true },
              { t: 'date', n: 'install', l: 'Install & burn-in' },
              { t: 'date', n: 'production', l: 'Production', req: true },
              { t: 'text', n: 'owner', l: 'Milestone owner' }
            ] },
          { t: 'select', n: 'poReady', l: 'Purchase order readiness', req: true, o: ['PO ready to issue', 'Within 30 days', '30 to 90 days', 'More than 90 days / exploratory'] },
          { t: 'area', n: 'scheduleNotes', l: 'Dependencies or constraints', hint: 'Power energisation dates, financing close, customer go-live.' }
        ] },

      { title: 'Export compliance screening', short: 'Screening', tag: 'U.S. EAR · UK · EU', numbered: true,
        fields: Q.exportScreens('the systems').concat([
          { t: 'screen', n: 'scrReexport', l: 'Do you intend to resell, re-export or transfer ownership of any of the systems after delivery?', req: true },
          { t: 'area', n: 'screenNotes', l: 'Notes on any "Yes" answer', req: function (v) { return ['scrWeapons', 'scrMilitary', 'scrSanctionedCountry', 'scrDeniedParty', 'scrD5', 'scrSupercomputer', 'scrTrainingD5', 'scrRemoteAccess', 'certHqOwnership', 'scrReexport'].some(function (k) { return v[k] === 'Yes'; }); } },
          { t: 'sub', l: 'Post-delivery obligations' },
          { t: 'note', l: 'After delivery the buyer will: confirm the final installation location within 30 days; provide photo or video proof of installation on request; not relocate, resell or redeploy the equipment without prior written notice; notify any change in ownership, end user, end use or location; and cooperate with any OEM, NVIDIA or regulatory audit or site visit.' },
          { t: 'agree', n: 'postDelivery', l: 'We agree to the post-delivery obligations above.', req: true }
        ]) },

      { title: 'Compliance package', short: 'Documents', tag: 'For OEM and NVIDIA review',
        intro: 'Tell us where each document stands. Attach what you have; anything outstanding follows through a secure link once you qualify.',
        fields: [
          { t: 'docs', n: 'docs', items: [
            { k: 'registrations', l: 'Corporate registrations', hint: 'For the purchaser and the named end user, in every jurisdiction of registration.', req: true },
            { k: 'ownershipDoc', l: 'Ownership and management structure', hint: 'Including percentage ownership across related entities.', req: true },
            { k: 'board', l: 'Board of directors', hint: 'List of directors, where applicable.', req: true },
            { k: 'leases', l: 'Signed leases / hosting contracts', hint: 'For the site named in Data center & colocation.', req: true },
            { k: 'pof', l: 'Proof of funds or financing commitment', req: true },
            { k: 'eus', l: 'Signed End-User Statement', hint: 'On the OEM template, model and quantity matching the PO.', req: true },
            { k: 'dcAttest', l: 'Data center attestation', hint: 'Signed by the operator.', req: true },
            { k: 'ids', l: 'Government ID for each owner of 25% or more', req: true },
            { k: 'counsel', l: 'Other compliance documents', hint: 'Anything prepared by internal or external counsel on the transaction.' }
          ] }
        ] },

      { title: 'Attestation & signature', short: 'Sign', tag: 'Binding declaration',
        fields: Q.attestation({ accurate: 'I confirm, on behalf of the company, that I am authorised to sign this dossier, that the end-user information was obtained directly from the named end user, and that every answer is true, accurate and complete as of today.' }).concat([
          { t: 'agree', n: 'attMatchPO', req: true, l: 'The product, model and quantity stated here will match the purchase order and every supporting certificate.' }
        ]) }
    ]
  };
})();
