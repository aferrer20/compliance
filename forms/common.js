/* Shared question blocks used by more than one dossier. */
(function () {
  window.VETTING_SCHEMAS = window.VETTING_SCHEMAS || {};
  var yes = function (k) { return function (v) { return v[k] === 'Yes'; }; };
  var no = function (k) { return function (v) { return v[k] === 'No'; }; };

  window.VQ = {
    yes: yes, no: no,
    submitter: [
      { t: 'sub', l: 'Who is completing this dossier' },
      { t: 'text', n: 'subName', l: 'Your full name', req: true, ac: 'name' },
      { t: 'text', n: 'subTitle', l: 'Your title', req: true, ac: 'organization-title' },
      { t: 'email', n: 'subEmail', l: 'Work email', req: true, ac: 'email', hint: 'Use your company domain. Personal mailboxes slow the review.' },
      { t: 'tel', n: 'subPhone', l: 'Direct phone', req: true, ac: 'tel' }
    ],
    ubos: { t: 'repeat', n: 'ubos', l: 'Ultimate beneficial owners (25% or more, or exercising control)', req: true, min: 1, start: 1, max: 8, item: 'Owner', add: 'Add another owner',
      hint: 'Natural persons, not holding companies. If no one holds 25%, list whoever ultimately controls the company.',
      fields: [
        { t: 'text', n: 'name', l: 'Full legal name', req: true },
        { t: 'country', n: 'nationality', l: 'Nationality', req: true },
        { t: 'country', n: 'residence', l: 'Country of residence' },
        { t: 'number', n: 'pct', l: 'Ownership %', req: true, ph: 'e.g. 60' },
        { t: 'text', n: 'role', l: 'Role / control', ph: 'Director, shareholder, trustee…' }
      ] },
    directors: { t: 'repeat', n: 'directors', l: 'Board of directors and senior officers', req: true, min: 1, start: 1, max: 12, item: 'Director', add: 'Add another director or officer',
      hint: 'Required by the OEM. Include the CEO, CFO and the person responsible for compliance.',
      fields: [
        { t: 'text', n: 'name', l: 'Full legal name', req: true },
        { t: 'text', n: 'title', l: 'Title', req: true },
        { t: 'country', n: 'nationality', l: 'Nationality' }
      ] },
    governance: [
      { t: 'yesno', n: 'stateOwned', l: 'Does any government, state agency or state-owned enterprise hold shares in, fund, or have the ability to control the company or any parent?', req: true, full: true },
      { t: 'yesno', n: 'pep', l: 'Is any owner, director or senior officer a politically exposed person (a current or former senior public official, or their close family or associate)?', req: true, full: true },
      { t: 'area', n: 'governanceDetail', l: 'Details', show: function (v) { return v.stateOwned === 'Yes' || v.pep === 'Yes'; }, req: true, hint: 'Name the person or body, the position held and the nature of the interest.' }
    ],
    exportScreens: function (scope) {
      var s = scope || 'the products';
      return [
        { t: 'note', l: 'For a compliant transaction the expected answer to each question is <b>No</b>. A "Yes" does not automatically end the review, but it must be explained below and cleared by our compliance team before anything proceeds.' },
        { t: 'screen', n: 'scrWeapons', l: 'Will ' + s + ' be used in connection with nuclear, chemical, biological, missile, rocket or unmanned aerial vehicle programmes?', req: true },
        { t: 'screen', n: 'scrMilitary', l: 'Will ' + s + ' be used for any military end use, or by or for any military end user (armed services, national guard, national or local police, or government intelligence or reconnaissance bodies)?', req: true },
        { t: 'screen', n: 'scrSanctionedCountry', l: 'Will ' + s + ' be exported, re-exported or transferred to any country subject to U.S., UK or EU embargo or comprehensive sanctions (including Cuba, Iran, North Korea, Syria, Russia, Belarus and the occupied regions of Ukraine)?', req: true },
        { t: 'screen', n: 'scrDeniedParty', l: 'Will ' + s + ' be supplied to, or accessed by, any person or company on a U.S., UK or EU denied-party, sanctions or restricted list, or any entity owned 50% or more by such a party?', req: true },
        { t: 'screen', n: 'scrD5', l: 'Will ' + s + ' be exported, re-exported or transferred to or within China, Hong Kong, Macau or any other EAR Country Group D:5 country, or to an entity headquartered there or whose ultimate parent is headquartered there?', req: true },
        { t: 'screen', n: 'scrSupercomputer', l: 'Will ' + s + ' be used in, or for the development of, a supercomputer or advanced-node semiconductor fabrication facility in a country subject to U.S. license requirements?', req: true },
        { t: 'screen', n: 'scrTrainingD5', l: 'If compute is offered as a service, will it be used to train AI models for or on behalf of any party headquartered in, or whose ultimate parent is headquartered in, China, Macau or Country Group D:5?', req: true },
        { t: 'screen', n: 'scrRemoteAccess', l: 'Will direct or remote access to ' + s + ' be permitted from any embargoed or restricted country, including through virtual machines, VPNs, APIs or a downstream reseller?', req: true },
        { t: 'screen', n: 'certHqOwnership', l: 'Is the company, or any parent or ultimate parent, headquartered in a country subject to U.S., UK or EU export restrictions, or owned 50% or more by any party on the BIS Entity List, Military End-User List or OFAC SDN List?', req: true }
      ];
    },
    attestation: function (extra) {
      return [
        { t: 'sign', n: 'signName', l: 'Authorised signatory: type your full legal name to sign', req: true },
        { t: 'text', n: 'signTitle', l: 'Title', req: true },
        { t: 'date', n: 'signDate', l: 'Date', req: true },
        { t: 'email', n: 'signEmail', l: 'Signatory email', req: true },
        { t: 'agree', n: 'attAccurate', req: true, l: extra && extra.accurate || 'I confirm, on behalf of the company, that I am authorised to sign this dossier and that every answer and document is true, accurate and complete as of today.' },
        { t: 'agree', n: 'attVerify', req: true, l: 'I authorise The Chief Negotiators and Strategic Supply Partners to independently verify everything provided, including corporate registry checks, sanctions and watchlist screening of the company and every named individual, adverse media searches, bank account confirmation, reference calls and confirmation with the relevant OEM and NVIDIA.' },
        { t: 'agree', n: 'attChanges', req: true, l: 'We will notify you in writing within five business days of any change in ownership, control, banking details, end user, end use, deployment location or sanctions status.' },
        { t: 'agree', n: 'attConsequence', req: true, l: 'I understand that any material misstatement or omission ends this process immediately, may be reported to the relevant OEM, NVIDIA and authorities, and that completing this dossier does not guarantee approval, allocation or supply.' },
        { t: 'agree', n: 'attPrivacy', req: true, l: 'I consent to this information being stored securely and processed solely for counterparty due diligence, compliance and regulatory record-keeping, and shared only with the OEM, NVIDIA or authorities where required.' }
      ];
    }
  };
})();
