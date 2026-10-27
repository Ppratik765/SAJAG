# Hindi Translation Review Queue (docs/HINDI_REVIEW.md)

> [!IMPORTANT]
> **Human Review Required**: The following Hindi strings have been machine-translated or authored in code and have **not yet been verified by a native Hindi speaker**. They must NOT be called verified until a native speaker has reviewed them for colloquial fluency, grammar, and emotional clarity for elderly family members.

---

## 1. Safety & Verdict Advisories (Critical)

| Key / Location | Hindi String | English Meaning / Context | Native Review |
|---|---|---|:---:|
| `safe_state_title`<br>`ResultCard.tsx` / `LevelStrip.tsx` | अभी कोई संकेत नहीं मिला | "No warning signs found yet" (Neutral, does NOT claim total safety) | [ ] |
| `safe_state_subtitle`<br>`ResultCard.tsx` | किसी भी अनजान कॉलर को कोड, पिन या पैसे न भेजें | "Still do not share codes, PINs or money with unknown callers" | [ ] |
| `suspicious_title`<br>`VerdictStamp.tsx` | संदिग्ध कॉल | "Suspicious Call" | [ ] |
| `likely_scam_title`<br>`VerdictStamp.tsx` | संभावित फ्रॉड | "Likely Scam" | [ ] |
| `scam_title`<br>`VerdictStamp.tsx` | फर्जी कॉल • फोन काटें | "Scam Call • Hang Up" | [ ] |
| `disclaimer`<br>`hi.json:hero.disclaimer` | सजग एक सहायक है, कोई गारंटी नहीं। | "Sajag is a helper, not a guarantee." | [ ] |

---

## 2. Spoken Voice Warnings (`api/app/config/warnings.yaml`)

These templates are synthesized with Gnani Timbre for voice playback during active calls:

| Scam Type / Kind | Spoken Hindi Text | Audio Filename | Native Review |
|---|---|---|:---:|
| `alert_scam` (General) | यह कॉल फर्जी लग रही है। किसी को पैसे या ओटीपी न दें। तुरंत फोन काटें। | `alert_scam.mp3` | [ ] |
| `alert_suspicious` (General) | सावधान रहें। यह कॉल संदिग्ध लग रही है। कोई भी कोड या पिन साझा न करें। | `alert_suspicious.mp3` | [ ] |
| `explain_digital_arrest` | पुलिस या सीबीआई कभी फोन पर गिरफ्तारी की धमकी देकर पैसे ट्रांसफर करने को नहीं कहती। यह डिजिटल अरेस्ट का फ्रॉड है। तुरंत कॉल काटें। | `explain_digital_arrest.mp3` | [ ] |
| `explain_bank_kyc` | बैंक या टेलीकॉम कंपनी कभी फोन पर ओटीपी, सीवीवी या पासवर्ड नहीं मांगती। किसी भी लिंक पर क्लिक न करें। फोन काट दें। | `explain_bank_kyc.mp3` | [ ] |
| `explain_upi_refund` | पैसे प्राप्त करने के लिए कभी भी यूपीआई पिन डालने की जरूरत नहीं होती। यह फर्जीवाड़ा है। तुरंत फोन काटें। | `explain_upi_refund.mp3` | [ ] |
| `explain_family_emergency` | किसी रिश्तेदार के संकट में होने का दावा करने वाले अनजान कॉल पर बिना सीधे बात किए पैसे न भेजें। फोन काटें और परिवार को फोन मिलाएं। | `explain_family_emergency.mp3` | [ ] |
| `explain_job_investment` | यूट्यूब लाइक करने या टेलीग्राम टास्क से रोजाना हजारों कमाने का दावा फर्जी होता है। कोई भी रजिस्ट्रेशन शुल्क न दें। फोन काटें। | `explain_job_investment.mp3` | [ ] |
| `explain_customs_parcel` | कस्टम या कूरियर कंपनी कभी ड्रग्स या पार्सल के नाम पर व्यक्तिगत खाते में पेनल्टी ट्रांसफर करने को नहीं कहती। तुरंत फोन काटें। | `explain_customs_parcel.mp3` | [ ] |
| `explain_electricity_bill` | बिजली विभाग कभी रात में कनेक्शन काटने की धमकी देकर अनजान नंबर पर बिल भरने को नहीं कहता। यह ठगी है। फोन काटें। | `explain_electricity_bill.mp3` | [ ] |
| `explain_unknown_suspicious` | इस कॉल में संदिग्ध बातें कही जा रही हैं। किसी भी अनजान कॉलर को कोई कोड, पिन या पैसे न दें। पहले परिवार से बात करें। | `explain_unknown_suspicious.mp3` | [ ] |

---

## 3. Margin Note Signal Tags (`CallSheet.tsx` / `live/page.tsx`)

| Signal Category | Hindi Margin Note | English Context | Native Review |
|---|---|---|:---:|
| `AUTHORITY_CLAIM` | पुलिस/एजेंसी का दावा | "Claimed police / CBI agency authority" | [ ] |
| `THREAT_ARREST` | गिरफ्तारी की धमकी | "Arrest or jail warrant threat" | [ ] |
| `ISOLATION` | कॉल काटने से मना किया | "Forbade hanging up the call" | [ ] |
| `SECRECY` | गोपनीय रखने को कहा | "Ordered to keep secret from family" | [ ] |
| `OTP_PIN_REQUEST` | ओटीपी या पिन मांगा | "Asked for OTP, PIN, or CVV" | [ ] |
| `MONEY_TRANSFER` | पैसे ट्रांसफर की मांग | "Demanded immediate money transfer" | [ ] |
| `REMOTE_ACCESS_APP` | ऐप डाउनलोड करने को कहा | "Asked to install AnyDesk/TeamViewer" | [ ] |
| `ACCOUNT_THREAT` | खाता ब्लॉक की धमकी | "Account/SIM block threat" | [ ] |
| `URGENCY` | जल्दबाजी का दबाव | "Created artificial emergency / rush" | [ ] |

---

## 4. Navigation & App Shell (`hi.json:nav`)

| Key | Hindi String | Context | Native Review |
|---|---|---|:---:|
| `nav.live` | लाइव कॉल | Top bar live listening tab | [ ] |
| `nav.check` | रिकॉर्डिंग जाँच | Audio recording check tab | [ ] |
| `nav.paste` | संदेश पेस्ट | Text paste analysis tab | [ ] |
| `nav.spot` | धोखा पहचानें | Interactive scam quiz game | [ ] |
| `nav.parent` | माता-पिता मोड | High-contrast parent mode | [ ] |
| `nav.demo` | डेमो देखें | Pre-recorded demo replay tab | [ ] |
| `nav.accuracy` | सटीकता | Accuracy metrics page | [ ] |
| `nav.about` | सजग के बारे में | About page | [ ] |

---

## 5. Hero & Mode Explanations (`hi.json:hero`, `hi.json:modes`)

| Key | Hindi String | Context | Native Review |
|---|---|---|:---:|
| `hero.title_primary` | क्या यह कॉल ठगी है? | Hero heading | [ ] |
| `hero.title_secondary` | भारतीय परिवारों के लिए मार्क किया हुआ कॉल शील्ड | Hero sub-heading | [ ] |
| `hero.description` | लाइव कॉल शीट जो ठगी के लाल निशान लगाती है और बोलकर बताती है कि फोन कब काटना है। | Hero paragraph | [ ] |
| `modes.live_title` | 1. स्पीकर पर लाइव | Mode 1 title | [ ] |
| `modes.live_desc` | स्पीकरफोन के पास फोन या लैपटॉप रखें। सजग ज्ञानी प्रिज्मा से रीयल-टाइम में कॉल सुनकर तुरंत चेतावनी देता है। | Mode 1 description | [ ] |
| `modes.check_title` | 2. रिकॉर्डिंग की जाँच | Mode 2 title | [ ] |
| `modes.check_desc` | व्हाट्सएप या कॉल रिकॉर्डर से वॉइस नोट या रिकॉर्डिंग अपलोड करें (3 मिनट तक)। | Mode 2 description | [ ] |
| `modes.paste_title` | 3. संदेश या टेक्स्ट पेस्ट | Mode 3 title | [ ] |
| `modes.paste_desc` | संदेश, व्हाट्सएप फॉरवर्ड या लिखा हुआ टेक्स्ट पेस्ट करें। बिना किसी बाहरी कॉल के तुरंत परिणाम। | Mode 3 description | [ ] |

---

## 6. Parent Mode Strings (`web/src/app/parent/page.tsx`)

| Key / Context | Hindi String | English Context | Native Review |
|---|---|---|:---:|
| Header Mode | माता-पिता मोड | Parent mode screen header | [ ] |
| Status: Listening | सुन रहे हैं... | Currently listening to call | [ ] |
| Status: Speaking | कॉलर बोल रहा है... | Caller speech detected | [ ] |
| Urgent Action | तुरंत फोन काटें! | "Hang up immediately!" action button | [ ] |
| Share Action | परिवार को बताएं | "Alert family on WhatsApp" button | [ ] |
| Safe State | अभी कोई संकेत नहीं मिला | No scam signs detected yet | [ ] |
