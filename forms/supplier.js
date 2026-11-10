/* Supplier vetting dossier — anyone selling GPUs, servers or components into the network. */
(function () {
  var Q = window.VQ, yes = Q.yes;
  window.VETTING_SCHEMAS.supplier = {
    id: 'supplier', version: 3, prefix: 'SV', entityField: 'legalName',
    title: 'Supplier Vetting Dossier',
    prefill: [['e', 'subEmail'], ['c', 'legalName']],
    next: [
      'A named reviewer screens the company, every owner and every director against U.S., UK and EU sanctions and export lists.',
      'We confirm your registration, bank account and channel authorization directly with the registry, your bank and the OEM. Expect a short verification call.',
      'Approved suppliers receive written confirmation and are released to the network. If anything needs clarification you will receive one focused set of questions.'
    ],
    sections: [
      { title: 'Entity identity', short: 'Entity', tag: 'Checked against the registry',
        intro: 'Exactly as registered. Every detail here is matched to the public corporate registry in your country of incorporation.',
        fields: [
          { t: 'text', n: 'legalName', l: 'Legal entity name', req: true, full: true, ac: 'organization' },
          { t: 'text', n: 'dba', l: 'Trading name / DBA' },
          { t: 'select', n: 'entityType', l: 'Which best describes the company?', req: true, o: ['OEM / manufacturer', 'Authorized distributor', 'Authorized reseller / VAR', 'Systems integrator', 'Independent broker / trader', 'Asset owner reselling its own fleet', 'Leasing / financing company'] },
          { t: 'text', n: 'regNumber', l: 'Company registration number', req: true },
          { t: 'text', n: 'taxId', l: 'Tax ID (EIN, VAT or local TIN)', req: true },
          { t: 'country', n: 'countryInc', l: 'Country of incorporation', req: true },
          { t: 'text', n: 'stateInc', l: 'State / province of incorporation' },
          { t: 'number', n: 'yearInc', l: 'Year incorporated', req: true, ph: 'YYYY' },
          { t: 'country', n: 'operatingCountry', l: 'Principal operating country', req: true },
          { t: 'area', n: 'regAddress', l: 'Registered address', req: true },
          { t: 'area', n: 'hqAddress', l: 'Principal place of business (if different)' },
          { t: 'url', n: 'website', l: 'Corporate website', req: true, ph: 'https://' },
          { t: 'email', n: 'companyEmail', l: 'General business email', req: true },
          { t: 'tel', n: 'companyPhone', l: 'Main switchboard number', req: true },
          { t: 'text', n: 'duns', l: 'D-U-N-S number' },
          { t: 'text', n: 'lei', l: 'LEI (Legal Entity Identifier)' },
          { t: 'area', n: 'formerNames', l: 'Former names or other entities used in the last five years' }
        ].concat(Q.submitter) },

      { title: 'Ownership & management', short: 'Ownership', tag: 'OEM requirement',
        why: 'The OEM and NVIDIA require the ownership and management structure, including percentage ownership across related entities, and the board of directors. Opaque ownership is the most common shield for diversion and fraud.',
        fields: [
          { t: 'text', n: 'parentCompany', l: 'Immediate parent company (if any)' },
          { t: 'text', n: 'ultParent', l: 'Ultimate parent company (if any)' },
          { t: 'country', n: 'ultParentCountry', l: 'Country of ultimate parent HQ', req: function (v) { return !!(v.ultParent || '').trim(); } },
          { t: 'area', n: 'relatedEntities', l: 'Related entities and percentage ownership', hint: 'Affiliates and subsidiaries in other jurisdictions, with the percentage held by each owner.' },
          Q.ubos, Q.directors
        ].concat(Q.governance, [
          { t: 'yesno', n: 'controlChange', l: 'Has there been any change of ownership or control in the last 24 months?', req: true, full: true },
          { t: 'area', n: 'controlChangeDetail', l: 'Describe the change', req: true, show: yes('controlChange') }
        ]) },

      { title: 'Supply chain & authenticity', short: 'Supply chain', tag: 'Where the hardware comes from',
        why: 'Counterfeit, grey-market and previously diverted GPUs are the largest commercial and legal exposure in this market. We trace every unit back to the OEM before money moves.',
        fields: [
          { t: 'multi', n: 'productCategories', l: 'What do you supply?', req: true, o: ['Data center GPUs', 'GPU servers (HGX / DGX / MGX)', 'Rack-scale systems (NVL72)', 'Networking (InfiniBand / Ethernet)', 'CPUs, memory and storage', 'Complete clusters', 'Other'] },
          { t: 'multi', n: 'brands', l: 'Brands supplied', req: true, o: ['NVIDIA', 'AMD', 'Dell', 'HPE', 'Supermicro', 'Lenovo', 'Gigabyte', 'ASUS', 'Cisco', 'Arista', 'Other'] },
          { t: 'seg', n: 'channelStatus', l: 'Are you an authorized channel partner for the brands you offer?', req: true, full: true, o: ['Authorized for every brand offered', 'Authorized for some', 'Not authorized (open market)'] },
          { t: 'area', n: 'partnerIds', l: 'Partner programme, tier and partner ID for each brand', req: true, show: function (v) { return v.channelStatus && v.channelStatus !== 'Not authorized (open market)'; }, ph: 'e.g. NVIDIA Partner Network, Elite, ID …; Dell Technologies Partner Program, Titanium, ID …' },
          { t: 'yesno', n: 'authLetter', l: 'Can you provide OEM authorization letters dated within the last 12 months?', req: true, full: true },
          { t: 'select', n: 'inventorySource', l: 'Where does the inventory you offer come from?', req: true, full: true, o: ['Directly from the OEM', 'From an authorized distributor', 'From an end user (decommissioned or surplus)', 'From another broker or trader', 'Mixed sources', 'Prefer not to say'] },
          { t: 'yesno', n: 'chainOfCustody', l: 'Can you provide purchase invoices that trace this inventory back to the OEM or an authorized distributor?', req: true, full: true },
          { t: 'select', n: 'condition', l: 'Condition', req: true, o: ['New, factory sealed', 'New, open box', 'Refurbished by the OEM', 'Refurbished by a third party', 'Used'] },
          { t: 'select', n: 'warranty', l: 'Warranty', req: true, o: ['Full OEM warranty, transferable to the buyer', 'OEM warranty, not transferable', 'Supplier warranty only', 'No warranty'] },
          { t: 'seg', n: 'possession', l: 'Inventory status', req: true, full: true, o: ['In our possession now', 'Partially in our possession', 'Allocation / to be sourced'] },
          { t: 'country', n: 'inventoryCountry', l: 'Country where the inventory is held today', req: true },
          { t: 'country', n: 'shipFromCountry', l: 'Country it will ship from', req: true },
          { t: 'yesno', n: 'everInRestricted', l: 'Has any of this inventory ever been located in, or shipped through, China, Hong Kong, Macau, Russia, Belarus, Iran or another embargoed country?', req: true, full: true },
          { t: 'yesno', n: 'serialVerify', l: 'Will you provide the full serial-number list for OEM entitlement verification before any payment?', req: true, full: true },
          { t: 'yesno', n: 'liveProof', l: 'Will you provide time-stamped photos and a live video walkthrough of the stock?', req: true, full: true },
          { t: 'yesno', n: 'inspection', l: 'Will you allow an independent third-party inspection at the warehouse before payment?', req: true, full: true },
          { t: 'yesno', n: 'sampleOrder', l: 'Will you fulfil a small paid first order before a full commitment?', req: true, full: true },
          { t: 'text', n: 'leadTime', l: 'Typical lead time' },
          { t: 'text', n: 'monthlyCapacity', l: 'Typical monthly volume available', ph: 'e.g. 64 × HGX H200 8-GPU' }
        ] },

      { title: 'Export control & sanctions', short: 'Export compliance', tag: 'ECCN 3A090 / 4A090', numbered: true,
        why: 'Advanced GPUs and the servers that carry them are controlled under the U.S. Export Administration Regulations. A supplier that has shipped to the wrong party puts every company in the chain at risk, including ours and yours.',
        fields: [
          { t: 'yesno', n: 'icp', l: 'Do you maintain a written export compliance programme?', req: true, full: true },
          { t: 'text', n: 'complianceOfficer', l: 'Compliance officer name and email', req: yes('icp'), show: yes('icp'), full: true },
          { t: 'yesno', n: 'screensCustomers', l: 'Do you screen every customer and consignee against the U.S. Consolidated Screening List before shipping?', req: true, full: true },
          { t: 'yesno', n: 'eccnAware', l: 'Do you classify what you sell by ECCN and check license requirements before export?', req: true, full: true },
          { t: 'sub', l: 'Screening questions' },
          { t: 'note', l: 'The expected answer to each question below is <b>No</b>. Explain any "Yes" in the notes.' },
          { t: 'screen', n: 'supSanctioned', l: 'Is the company, or any owner, director or officer, named on the OFAC SDN List, BIS Entity List, Military End-User List, Unverified List, or any UK or EU sanctions list?', req: true },
          { t: 'screen', n: 'supRestrictedOwn', l: 'Is the company headquartered in, or 50% or more owned by persons in, a comprehensively sanctioned country or Country Group D:5 (including China, Hong Kong and Macau)?', req: true },
          { t: 'screen', n: 'supD5Sales', l: 'In the last 36 months, have you sold, shipped or transferred advanced GPUs or GPU servers to China, Hong Kong, Macau or any D:5 country, or to a party headquartered there?', req: true },
          { t: 'screen', n: 'supInvestigation', l: 'Has the company or any principal been the subject of an investigation, penalty, warning letter or voluntary disclosure involving BIS, OFAC, the DOJ or any non-U.S. export authority?', req: true },
          { t: 'screen', n: 'supForwarder', l: 'Do you ship to freight forwarders or consolidators without knowing and screening the final consignee?', req: true },
          { t: 'screen', n: 'supRussia', l: 'Do you have operations, customers or bank accounts in Russia, Belarus, Iran, North Korea, Syria, Cuba or the occupied regions of Ukraine?', req: true },
          { t: 'area', n: 'screenNotes', l: 'Notes on any "Yes" answer', req: function (v) { return ['supSanctioned', 'supRestrictedOwn', 'supD5Sales', 'supInvestigation', 'supForwarder', 'supRussia'].some(function (k) { return v[k] === 'Yes'; }); } },
          { t: 'sub', l: 'Commitments' },
          { t: 'yesno', n: 'antiDiversion', l: 'Will you sign contractual anti-diversion, end-use and re-export restrictions as part of the supplier agreement?', req: true, full: true },
          { t: 'yesno', n: 'abc', l: 'Do you maintain an anti-bribery policy (FCPA / UK Bribery Act) and confirm no payments are made to officials to secure allocation or clearance?', req: true, full: true }
        ] },

      { title: 'Banking & payment integrity', short: 'Banking', tag: 'Where the money goes',
        why: 'The name on the receiving account must match the legal entity, without exception. A mismatch is the single most common indicator of wire-redirection fraud. We confirm these details with your bank on a number we source ourselves.',
        fields: [
          { t: 'text', n: 'bankName', l: 'Bank name', req: true },
          { t: 'country', n: 'bankCountry', l: 'Bank country', req: true },
          { t: 'text', n: 'accountHolder', l: 'Exact account holder name', req: true, full: true },
          { t: 'seg', n: 'holderMatches', l: 'Is the account holder identical to the legal entity name above?', req: true, full: true, o: ['Yes, identical', 'No, a different name'] },
          { t: 'text', n: 'accountNo', l: 'IBAN or account number', req: true },
          { t: 'text', n: 'swift', l: 'SWIFT / BIC' },
          { t: 'text', n: 'routing', l: 'ABA routing number (U.S. accounts)' },
          { t: 'yesno', n: 'bankChanged', l: 'Have these bank details changed in the last 90 days?', req: true },
          { t: 'select', n: 'paymentTerms', l: 'Preferred payment terms', req: true, o: ['Escrow / verified milestones', 'Letter of credit', 'Net terms after delivery', 'Deposit, balance on delivery', '100% upfront by wire'] },
          { t: 'yesno', n: 'escrow', l: 'Will you transact through escrow when requested?', req: true },
          { t: 'yesno', n: 'callback', l: 'Will you confirm these details on a recorded call to a number we source independently?', req: true, full: true },
          { t: 'yesno', n: 'bankLetter', l: 'Can you provide a bank reference letter or account confirmation on bank letterhead?', req: true, full: true }
        ] },

      { title: 'Financial standing & track record', short: 'Track record', tag: 'Ability to perform',
        fields: [
          { t: 'number', n: 'yearsTrading', l: 'Years actively trading', req: true },
          { t: 'select', n: 'revenue', l: 'Annual revenue', req: true, o: ['Under $1M', '$1M – $10M', '$10M – $50M', '$50M – $250M', '$250M+'] },
          { t: 'select', n: 'largestDeal', l: 'Largest single GPU transaction completed', req: true, o: ['None yet', 'Under $250K', '$250K – $1M', '$1M – $5M', '$5M – $25M', '$25M+'] },
          { t: 'select', n: 'gpuDeals12m', l: 'GPU transactions completed in the last 12 months', req: true, o: ['None', '1 – 5', '6 – 20', '21+'] },
          { t: 'yesno', n: 'audited', l: 'Audited or reviewed financial statements available?', req: true },
          { t: 'yesno', n: 'creditInsurance', l: 'Covered by trade-credit insurance?' },
          { t: 'yesno', n: 'cargoInsurance', l: 'Cargo and product liability insurance in place?', req: true },
          { t: 'yesno', n: 'litigation', l: 'Any litigation, judgment, default or insolvency in the last five years?', req: true },
          { t: 'area', n: 'litigationDetail', l: 'Describe', req: true, show: yes('litigation') }
        ] },

      { title: 'References & verification', short: 'Verification', tag: 'Independent proof',
        intro: 'We call references on numbers we verify independently, never only on the numbers provided.',
        fields: [
          { t: 'repeat', n: 'refs', l: 'Trade references', req: true, min: 2, start: 2, max: 4, item: 'Reference', add: 'Add a reference', hint: 'At least two. An OEM or authorized distributor reference carries the most weight.',
            fields: [
              { t: 'text', n: 'company', l: 'Company', req: true },
              { t: 'text', n: 'contact', l: 'Contact name', req: true },
              { t: 'select', n: 'kind', l: 'Relationship', req: true, o: ['OEM / distributor', 'Customer', 'Bank', 'Other'] },
              { t: 'email', n: 'email', l: 'Email', req: true },
              { t: 'tel', n: 'phone', l: 'Phone', req: true },
              { t: 'text', n: 'value', l: 'Approx. value transacted' }
            ] },
          { t: 'yesno', n: 'videoCall', l: 'Will a principal join a live video verification call?', req: true, full: true },
          { t: 'yesno', n: 'siteVisit', l: 'Will you permit an on-site or live virtual facility visit?', req: true, full: true },
          { t: 'area', n: 'principalsLinkedIn', l: 'LinkedIn profiles of the principals', hint: 'One per line.' },
          { t: 'url', n: 'marketplace', l: 'Marketplace profile with transaction history (if any)' }
        ] },

      { title: 'Document package', short: 'Documents', tag: 'Evidence',
        intro: 'Tell us where each document stands. Attach what you have now; anything outstanding can follow through a secure link once we reply.',
        fields: [
          { t: 'docs', n: 'docs', items: [
            { k: 'incorporation', l: 'Certificate of incorporation and good standing', hint: 'Issued within the last 90 days.', req: true },
            { k: 'ownershipChart', l: 'Ownership and management structure', hint: 'Showing percentage ownership across all related entities.', req: true },
            { k: 'directors', l: 'Register of directors and officers', req: true },
            { k: 'authLetters', l: 'OEM / NVIDIA channel authorization letters', req: true },
            { k: 'bankLetter', l: 'Bank reference letter or account confirmation', hint: 'On bank letterhead, in the exact entity name.', req: true },
            { k: 'taxForm', l: 'W-9 or W-8BEN-E', req: true },
            { k: 'financials', l: 'Most recent financial statements', req: true },
            { k: 'exportPolicy', l: 'Export compliance and anti-diversion policy', req: true },
            { k: 'inventoryList', l: 'Serial-numbered inventory list for the current offer', req: true },
            { k: 'ids', l: 'Government ID for each owner of 25% or more', req: true },
            { k: 'insurance', l: 'Insurance certificate' }
          ] }
        ] },

      { title: 'Attestation & signature', short: 'Sign', tag: 'Binding declaration',
        intro: 'A signed declaration completes the dossier.',
        fields: Q.attestation() }
    ]
  };
})();
