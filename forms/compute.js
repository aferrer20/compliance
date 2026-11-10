/* Compute capacity qualification — off-takers leasing GPU capacity rather than buying hardware. */
(function () {
  var Q = window.VQ, yes = Q.yes;
  var shared = function (v) { return v.accessModel && v.accessModel !== 'Internal staff only'; };
  window.VETTING_SCHEMAS.compute = {
    id: 'compute', version: 3, prefix: 'CQ', entityField: 'offtakerName',
    title: 'Compute Capacity Qualification',
    prefill: [['e', 'subEmail'], ['c', 'offtakerName']],
    next: [
      'A named reviewer screens the off-taker, its owners and its signatory against U.S., UK and EU sanctions and export lists.',
      'We assess credit and funding, then match the requirement against qualified capacity in the network.',
      'Nothing is shared with any operator until the opportunity is qualified and you agree to proceed. A mutual NDA is available on request.'
    ],
    sections: [
      { title: 'You & the off-taker', short: 'Off-taker', tag: 'Held in confidence',
        intro: 'What you share is used solely to qualify this opportunity and is never disclosed to a counterparty without your agreement.',
        fields: [
          { t: 'select', n: 'role', l: 'Your role', req: true, full: true, o: ['Off-taker (we will consume the capacity)', 'Advisor or broker acting for an off-taker', 'Neocloud or reseller of capacity'] },
          { t: 'text', n: 'offtakerName', l: 'Off-taker legal name', req: true },
          { t: 'url', n: 'offtakerWebsite', l: 'Off-taker website', req: true, ph: 'https://' },
          { t: 'text', n: 'offtakerReg', l: 'Company registration number', req: true },
          { t: 'country', n: 'offtakerCountry', l: 'Country of incorporation', req: true },
          { t: 'country', n: 'offtakerHqCountry', l: 'Headquarters country', req: true },
          { t: 'text', n: 'offtakerUltParent', l: 'Ultimate parent company (if any)' },
          { t: 'country', n: 'offtakerUltParentCountry', l: 'Country of ultimate parent HQ', req: function (v) { return !!(v.offtakerUltParent || '').trim(); } },
          { t: 'text', n: 'offtakerContact', l: 'Off-taker decision maker (name, title)', req: true },
          { t: 'yesno', n: 'ndaNeeded', l: 'Do you need a mutual NDA before sharing further detail?', req: true }
        ].concat(Q.submitter) },

      { title: 'Capacity requirement', short: 'Requirement', tag: 'Cluster specification',
        fields: [
          { t: 'select', n: 'gpuModel', l: 'GPU model', req: true, o: ['H100', 'H200', 'B200', 'B300', 'GB200 NVL72', 'GB300 NVL72', 'MI300X / MI355X', 'Flexible'] },
          { t: 'number', n: 'totalGpus', l: 'Total GPUs at launch', req: true },
          { t: 'number', n: 'numClusters', l: 'Number of clusters' },
          { t: 'number', n: 'gpusPerCluster', l: 'GPUs per cluster' },
          { t: 'number', n: 'initialMW', l: 'Initial power required (MW)' },
          { t: 'number', n: 'scaleMW', l: 'Scale potential (MW)' },
          { t: 'select', n: 'fabric', l: 'Fabric', o: ['InfiniBand', 'Spectrum-X / RoCE Ethernet', 'Flexible'] },
          { t: 'select', n: 'cooling', l: 'Cooling', o: ['Air', 'Direct liquid cooling', 'Flexible'] },
          { t: 'text', n: 'trainInfer', l: 'Training vs inference split', ph: 'e.g. 70 / 30' },
          { t: 'yesno', n: 'storageNeeded', l: 'Additional storage required?' },
          { t: 'text', n: 'primaryLocation', l: 'Primary location preference' },
          { t: 'area', n: 'acceptableLocations', l: 'Acceptable locations', hint: 'Regions or countries you would accept, and any you cannot accept.' },
          { t: 'text', n: 'latency', l: 'Latency or separation requirements' }
        ] },

      { title: 'Commercial terms', short: 'Terms', tag: 'Structure',
        fields: [
          { t: 'select', n: 'leaseStructure', l: 'Contract structure', req: true, o: ['Reserved capacity / take-or-pay', 'Bare-metal lease', 'Managed cloud', 'Operating lease', 'Finance lease', 'Other'] },
          { t: 'number', n: 'termMonths', l: 'Term (months)', req: true },
          { t: 'text', n: 'targetPrice', l: 'Target price', ph: '$ per GPU-hour or per month' },
          { t: 'select', n: 'contractValue', l: 'Estimated contract value', req: true, o: ['Under $1M', '$1M – $10M', '$10M – $50M', '$50M – $250M', '$250M+'] },
          { t: 'select', n: 'prepay', l: 'Prepayment capacity', req: true, o: ['Three months or more', 'One to two months', 'Security deposit only', 'No prepayment'] },
          { t: 'yesno', n: 'takeOrPay', l: 'Willing to sign take-or-pay?', req: true },
          { t: 'date', n: 'goLive', l: 'Target go-live', req: true }
        ] },

      { title: 'Credit & funding', short: 'Credit', tag: 'Ability to pay',
        why: 'Operators commit capital against your contract. We confirm the off-taker can pay for the full term before introducing anyone.',
        fields: [
          { t: 'multi', n: 'fundingSources', l: 'How will the contract be funded?', req: true, o: ['Operating cash flow', 'Cash on balance sheet', 'Equity (VC / PE)', 'Debt facility', 'Parent company guarantee', 'Customer revenue under contract', 'Other'] },
          { t: 'select', n: 'budgetStatus', l: 'Budget status', req: true, o: ['Approved', 'In approval', 'Exploratory'] },
          { t: 'select', n: 'pof', l: 'Proof of funds / credit', req: true, o: ['Available now', 'Available on request', 'In process', 'Not yet available'] },
          { t: 'yesno', n: 'financials', l: 'Audited financial statements available?', req: true },
          { t: 'text', n: 'creditRating', l: 'Credit rating (if any)', ph: 'Agency and rating' },
          { t: 'yesno', n: 'guarantor', l: 'Will a parent or third party guarantee the contract?', req: true },
          { t: 'text', n: 'guarantorName', l: 'Guarantor legal name', req: yes('guarantor'), show: yes('guarantor') },
          { t: 'text', n: 'signatory', l: 'Who signs the contract (name, title)', req: true }
        ] },

      { title: 'Ownership & control', short: 'Ownership', tag: 'Beneficial owners',
        fields: [Q.ubos].concat(Q.governance) },

      { title: 'Workloads & access', short: 'Workloads', tag: 'End use',
        fields: [
          { t: 'area', n: 'workloads', l: 'What will the capacity be used for?', req: true, hint: 'The application, the operator and the scale.' },
          { t: 'multi', n: 'useCategories', l: 'Select all that apply', req: true, o: ['AI training', 'AI inference', 'Fine-tuning', 'HPC / simulation', 'Rendering', 'Research', 'Other'] },
          { t: 'select', n: 'accessModel', l: 'Who will have access to the compute?', req: true, o: ['Internal staff only', 'Named enterprise customers under contract', 'Self-serve public cloud', 'Mixed'] },
          { t: 'area', n: 'accessCountries', l: 'Every country users will access the capacity from', req: true },
          { t: 'yesno', n: 'downstreamKyc', l: 'Do you run KYC and denied-party screening on every customer before granting access?', req: shared, show: shared, full: true }
        ] },

      { title: 'Export compliance screening', short: 'Screening', tag: 'U.S. EAR · UK · EU', numbered: true,
        fields: Q.exportScreens('the capacity').concat([
          { t: 'area', n: 'screenNotes', l: 'Notes on any "Yes" answer', req: function (v) { return ['scrWeapons', 'scrMilitary', 'scrSanctionedCountry', 'scrDeniedParty', 'scrD5', 'scrSupercomputer', 'scrTrainingD5', 'scrRemoteAccess', 'certHqOwnership'].some(function (k) { return v[k] === 'Yes'; }); } }
        ]) },

      { title: 'Attestation & signature', short: 'Sign', tag: 'Binding declaration',
        fields: Q.attestation() }
    ]
  };
})();
