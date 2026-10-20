"""Authoring tool that generates all 162 corpus scripts (81 scam + 81 legit)

Guarantees:
- 9 scam types x 3 scripts x 3 languages (hi-IN, hi-en, en-IN) = 81 scam scripts
- 6 legit kinds across 3 languages (hi-IN, hi-en, en-IN) = 81 legit scripts
- Deterministic 70/30 dev/test split via sha256(id)
- Zero real PII, numbers spelled as words
"""

from __future__ import annotations

import hashlib
import sys
from pathlib import Path

# Add api to path for schema imports
REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
if str(REPO_ROOT / "api") not in sys.path:
    sys.path.insert(0, str(REPO_ROOT / "api"))

import yaml
from eval.corpus import Script, ScriptTurn, compute_split

OUT_DIR = REPO_ROOT / "data" / "corpus" / "scripts"
OUT_DIR.mkdir(parents=True, exist_ok=True)

# Dialogue data definitions
SCAM_DATA = {
    "digital_arrest": {
        "hi-IN": [
            [
                ("caller", "नमस्ते, मैं दिल्ली पुलिस क्राइम ब्रांच से सब इंस्पेक्टर अजय बात कर रहा हूँ।"),
                ("victim", "हाँ जी, पुलिस ने मेरे नंबर पर क्यों कॉल किया?"),
                ("caller", "आपके आधार नंबर पर गैरकानूनी पार्सल मिला है जिसमें नशीली दवाएं हैं। आपके खिलाफ गिरफ्तारी वारंट जारी हुआ है।"),
                ("victim", "अरे भगवान, मैंने कोई पार्सल नहीं भेजा।"),
                ("caller", "सुप्रीम कोर्ट के आदेश पर आपको डिजिटल अरेस्ट में रखा गया है। कमरा बंद कर लीजिए और किसी को मत बताना। वीडियो कॉल मत काटना।"),
                ("victim", "जी सर, मैं कमरा बंद करके कॉल पर ही हूँ।"),
            ],
            [
                ("caller", "यह सीबीआई मुख्य मुख्यालय से चेतावनी कॉल है। आपके नाम पर मनी लॉन्ड्रिंग का केस दर्ज हुआ है।"),
                ("victim", "सीबीआई? मैंने जिंदगी में कोई गलत काम नहीं किया।"),
                ("caller", "आपके बैंक खाते से करोड़ों का अवैध लेन देन हुआ है। सुप्रीम कोर्ट का गैर जमानती वारंट निकला है।"),
                ("victim", "सर, मैं क्या करूँ? कृपया मदद कीजिए।"),
                ("caller", "तुरंत वीडियो कॉल चालू रखें, अपने घर वालों को मत बताना। जब तक जांच पूरी न हो, कॉल काटना मना है।"),
                ("victim", "जी, मैं किसी को नहीं बताऊँगा, प्लीज मेरी बात सुनिए।"),
            ],
            [
                ("caller", "साइबर सेल हेडक्वार्टर से डीसीपी शर्मा। आपके सिम कार्ड से अवैध गतिविधियां पकड़ी गई हैं।"),
                ("victim", "सर, यह मेरा पुराना नंबर है, क्या हुआ है?"),
                ("caller", "ट्राई और पुलिस की संयुक्त जांच में आपके खिलाफ अरेस्ट वारंट जारी हुआ है। आप तुरंत डिजिटल अरेस्ट में हैं।"),
                ("victim", "डिजिटल अरेस्ट? यह कैसे हो सकता है?"),
                ("caller", "शांत रहिए और कमरा अंदर से लॉक कर लीजिए। कोई भी बात बाहर नहीं जानी चाहिए, पूरी जांच गोपनीय है।"),
                ("victim", "जी ठीक है सर, मैं कमरा बंद कर रहा हूँ।"),
            ],
        ],
        "hi-en": [
            [
                ("caller", "Hello, main Delhi Police Cyber Cell se Inspector Verma bol raha hu."),
                ("victim", "Yes inspector sir, kya problem ho gayi?"),
                ("caller", "Aapke Aadhaar card par illegal courier parcel pakda gaya hai. Court order se aapko digital arrest kiya gaya hai."),
                ("victim", "Sir maine koi courier nahi mangwaya, main to student hu."),
                ("caller", "Abhi investigation chal rahi hai. Kisi ko mat batana, room lock karke video call par bane rahiye. Call mat kaatna."),
                ("victim", "Okay sir, please help me, main call cut nahi karunga."),
            ],
            [
                ("caller", "This is CBI officer calling. Aapke khilaf illegal money transfer ka case registered hua hai."),
                ("victim", "Sir ye kisi ne mere documents ka misuse kiya hoga."),
                ("caller", "Aapke naam par arrest warrant nikla hai. You are under digital arrest right now."),
                ("victim", "Arrest warrant? But maine to kuch kiya hi nahi."),
                ("caller", "Quiet rahiye, family ko mat batana. Jab tak CBI clearance na mile, screen ke samne rahiye."),
                ("victim", "Yes sir, main screen ke aage hi baitha hu."),
            ],
            [
                ("caller", "Mumbai Police Cyber Branch se alert hai. Serious criminal charges have been filed against you."),
                ("victim", "What charges sir? Maine kya kiya?"),
                ("caller", "Court ne immediate arrest order diya hai. Stay in a closed room under digital arrest."),
                ("victim", "Can I call my lawyer first?"),
                ("caller", "Strictly prohibited. Confidential investigation hai, kisi ko mat batana aur call cut mat karna."),
                ("victim", "Alright sir, I am staying on the line."),
            ],
        ],
        "en-IN": [
            [
                ("caller", "Good morning, this is Inspector Rathore calling from Delhi Police Cyber Crime Division."),
                ("victim", "Hello inspector, why are you calling my personal number?"),
                ("caller", "A courier parcel in your name was intercepted containing prohibited narcotics. An arrest warrant is issued."),
                ("victim", "Officer, that is impossible, I never booked any parcel."),
                ("caller", "You are placed under digital arrest by high court order. Lock your room, turn on video, and do not tell anyone."),
                ("victim", "I am very scared officer, I am staying on the line."),
            ],
            [
                ("caller", "This is the Central Bureau of Investigation cyber fraud monitoring cell. Criminal FIR has been lodged against you."),
                ("victim", "CBI? What is this allegation about?"),
                ("caller", "Your bank credentials were found in an illegal money laundering network. Non-bailable arrest warrant is active."),
                ("victim", "I have never engaged in any money laundering!"),
                ("caller", "Remain under digital arrest until verification completes. Keep this completely confidential and do not disconnect."),
                ("victim", "Understood officer, I will not disconnect the call."),
            ],
            [
                ("caller", "Supreme Court enforcement alert. This call is from Crime Branch headquarters regarding immediate arrest order."),
                ("victim", "What arrest order? Please explain."),
                ("caller", "Multiple fraudulent bank transactions were traced to your Aadhaar identity. You are under digital arrest."),
                ("victim", "Can I go to the local police station to clarify?"),
                ("caller", "No, stay on the video call inside a private room. Disconnecting the call will result in immediate physical arrest."),
                ("victim", "Okay officer, I am staying inside my room."),
            ],
        ],
    },
    "bank_kyc": {
        "hi-IN": [
            [
                ("caller", "नमस्कार, मैं भारतीय स्टेट बैंक मुख्य शाखा से सीनियर मैनेजर बात कर रहा हूँ।"),
                ("victim", "हाँ जी सर, क्या बात है?"),
                ("caller", "आपका बैंक खाता केवाईसी अपडेट न होने के कारण आज रात बारह बजे हमेशा के लिए ब्लॉक हो जाएगा।"),
                ("victim", "अरे, खाता बंद मत कीजिए, मेरी पेंशन उसी खाते में आती है।"),
                ("caller", "परेशान मत होइए, मैं यहीं से ऑनलाइन अपडेट कर देता हूँ। आपके मोबाइल पर छह अंकों का ओटीपी आया होगा, तुरंत बताइए।"),
                ("victim", "हाँ, मैसेज आया है, मैं अभी देखकर ओटीपी बताता हूँ।"),
            ],
            [
                ("caller", "पीएनबी बैंक कस्टमर केयर से वेरिफिकेशन ऑफिसर। आपका डेबिट कार्ड ब्लॉक कर दिया गया है।"),
                ("victim", "मेरा कार्ड क्यों ब्लॉक हुआ? कल तो मैंने पैसे निकाले थे।"),
                ("caller", "केवाईसी एक्सपायर हो चुकी है। अगर अभी रिन्यू नहीं किया तो अकाउंट सीज हो जाएगा। मोबाइल पर आया ओटीपी शेयर कीजिए।"),
                ("victim", "क्या बैंक फोन पर ओटीपी मांगता है?"),
                ("caller", "यह हेड ऑफिस की इमरजेंसी वेरिफिकेशन है। ओटीपी नहीं देंगे तो खाता कभी दोबारा नहीं खुलेगा।"),
                ("victim", "अच्छा ठीक है सर, ओटीपी चार पांच दो एक है।"),
            ],
            [
                ("caller", "एचडीएफसी बैंक सुरक्षा विभाग। आपके बचत खाते में संदिग्ध गतिविधि के कारण खाता सस्पेंड हो रहा है।"),
                ("victim", "सर, खाते में मेरी सारी जमा पूंजी है, कृपया कुछ कीजिए।"),
                ("caller", "खाता अनब्लॉक करने के लिए बायोमेट्रिक कोड आया है। तुरंत वह छह अंकों का पिन या ओटीपी मुझे बोलिए।"),
                ("victim", "जी मैं फोन चेक कर रहा हूँ, तुरंत बताता हूँ।"),
                ("caller", "जल्दी कीजिए, दो मिनट में सर्वर लिंक एक्सपायर हो जाएगा।"),
                ("victim", "ओटीपी आठ नौ छह तीन है सर।"),
            ],
        ],
        "hi-en": [
            [
                ("caller", "Hello sir, main ICICI bank card division se bol raha hu."),
                ("victim", "Yes, what is the matter?"),
                ("caller", "Sir aapka bank account KYC pending hai. Agar update nahi kiya to aaj raat account block ho jayega."),
                ("victim", "Branch aana padega kya update karne ke liye?"),
                ("caller", "Nahi sir, phone par ho jayega. Aapke number par six digit OTP aaya hai, jaldi se OTP bata dijiye."),
                ("victim", "Wait sir, messages check karke OTP bolta hu."),
            ],
            [
                ("caller", "HDFC bank support alert: Aapka debit card expire ho raha hai aur account suspend ho gaya hai."),
                ("victim", "Account suspend? But why?"),
                ("caller", "Mandatory KYC renewal needed sir. Verification ke liye phone par aaya hua secret OTP share karein."),
                ("victim", "Bank says never share OTP on phone."),
                ("caller", "Ye system verification call hai sir, agar OTP nahi denge to account permanently close ho jayega."),
                ("victim", "Okay okay, OTP is nine two four seven."),
            ],
            [
                ("caller", "Axis bank manager Verma calling. Urgent KYC update is required on your savings account."),
                ("victim", "Maine to pichle saal hi KYC submit kiya tha."),
                ("caller", "Aadhaar link disconnect ho gaya hai sir. Turant code verified karwaiye warna account block hoga. Give OTP now."),
                ("victim", "Sir message me OTP likha hai, padh ke batata hu."),
                ("caller", "Fast boliye sir, session timeout ho jayega."),
                ("victim", "The code is five eight three one."),
            ],
        ],
        "en-IN": [
            [
                ("caller", "Good afternoon sir, this is State Bank of India customer service head office calling."),
                ("victim", "Yes, how may I help you?"),
                ("caller", "Your savings bank account will be blocked tonight at eight PM due to mandatory KYC expiry."),
                ("victim", "Oh no, my salary account cannot be blocked! How do I fix it?"),
                ("caller", "I will update it immediately from the portal. Please share the six-digit verification OTP received on your mobile."),
                ("victim", "Let me check the text message. The OTP is four one seven two."),
            ],
            [
                ("caller", "Urgent alert from HDFC Bank security operations. Your netbanking access is suspended."),
                ("victim", "Why is my netbanking suspended?"),
                ("caller", "Your KYC compliance document has lapsed. To unblock immediately, confirm the one time password sent to you."),
                ("victim", "Should I not visit the branch tomorrow morning?"),
                ("caller", "If you wait until tomorrow, bank penalties of five thousand rupees will apply. Provide the OTP right now."),
                ("victim", "Fine, the verification code in the SMS is eight zero six four."),
            ],
            [
                ("caller", "This is Bank of Baroda central processing center calling regarding your account verification."),
                ("victim", "Yes officer, tell me."),
                ("caller", "Due to regulatory guidelines, your card and account will freeze tonight unless KYC is verified online."),
                ("victim", "What do I need to provide?"),
                ("caller", "Just read out the six-digit authorization code received on your registered phone number."),
                ("victim", "I received the SMS, code is three nine five zero."),
            ],
        ],
    },
    "upi_refund": {
        "hi-IN": [
            [
                ("caller", "नमस्ते भइया, मैंने गलती से आपके गूगल पे नंबर पर दस हजार रुपये भेज दिए हैं।"),
                ("victim", "दस हजार? रुकिए मैं बैंक बैलेंस चेक करता हूँ।"),
                ("caller", "भइया गलती से रॉन्ग ट्रांसफर हो गया, मेरे बच्चे की दवाई के पैसे थे। आप फोनपे खोलकर रिफंड एक्सेप्ट कर लीजिए।"),
                ("victim", "पैसे वापस कैसे भेजूं? मुझे ज्यादा चलाना नहीं आता।"),
                ("caller", "मैंने रिक्वेस्ट भेजी है, बस नोटिफिकेशन पर क्लिक करके अपना यूपीआई पिन डाल दीजिए, रिफंड आ जाएगा।"),
                ("victim", "पिन डालने से तो पैसे कटते हैं ना?"),
            ],
            [
                ("caller", "सर नमस्कार, पेटीएम कस्टमर केयर से बात कर रहा हूँ। आपके पिछले आर्डर का सात सौ रुपये का कैशबैक रिफंड अप्रूव हुआ है।"),
                ("victim", "अच्छा, कैशबैक तो काफी दिन से पेंडिंग था।"),
                ("caller", "हाँ सर, रिफंड कलेक्ट करने के लिए अपने यूपीआई ऐप में जाकर पिन एंटर कीजिए, तुरंत बैंक में क्रेडिट होगा।"),
                ("victim", "क्या पैसे लेने के लिए भी यूपीआई पिन डालना पड़ता है?"),
                ("caller", "हाँ सर, यह सरकारी डिजिटल ऑथराइजेशन है, पिन डालेंगे तभी अमाउंट क्रेडिट होगा।"),
                ("victim", "नहीं भैया, यह मुझे गड़बड़ लग रहा है।"),
            ],
            [
                ("caller", "अरे भाई साहब, गलती से मैंने आपके फोन नंबर पर बीस हजार ट्रांसफर कर दिए। प्लीज वापस कर दो।"),
                ("victim", "मेरे फोन पर तो कोई पैसे आने का मैसेज नहीं आया।"),
                ("caller", "बैंक सर्वर स्लो है, मैंने क्यूआर कोड भेजा है। क्यूआर कोड स्कैन करके यूपीआई पिन दबाइए, सीधे रिवर्स हो जाएगा।"),
                ("victim", "क्यूआर कोड स्कैन करने से मेरे खाते से पैसे कट जाएंगे।"),
                ("caller", "नहीं कटेगा भाई साहब, रिवर्सल सिस्टम है, पिन डालिए विश्वास रखिए।"),
                ("victim", "मुझे नहीं लगता यह सुरक्षित है।"),
            ],
        ],
        "hi-en": [
            [
                ("caller", "Hello sir, by mistake I sent five thousand rupees to your Google Pay number."),
                ("victim", "Let me check my transaction history first."),
                ("caller", "Sir urgent hospital bill tha, galti se number galat type ho gaya. Please UPI app open karke refund accept kar lo."),
                ("victim", "How do I return it back to your account?"),
                ("caller", "Maine refund link share kiya hai. Just enter your secret UPI PIN to receive money back."),
                ("victim", "Entering UPI PIN to receive money sounds like a scam."),
            ],
            [
                ("caller", "Paytm cashback desk calling sir. You have won four thousand rupees cashback refund."),
                ("victim", "Is it directly deposited in my bank account?"),
                ("caller", "Yes sir, PhonePe open kijiye, notification click karke UPI PIN enter karein, turant cash credit hoga."),
                ("victim", "Why do I need to enter UPI PIN to receive prize money?"),
                ("caller", "Sir standard RBI protocol hai, bina PIN enter kiye credit verify nahi hota."),
                ("victim", "I will not enter my PIN without confirming with bank."),
            ],
            [
                ("caller", "Bhaiya shopkeeper bol raha hu, aapke account me accidentally balance chala gaya hai."),
                ("victim", "Mera phone check karta hu, koi credit nahi dikh raha."),
                ("caller", "Aap QR code scan karke confirm kar lijiye aur apna security PIN dalke reversal authenticate kijiye."),
                ("victim", "QR scan aur PIN se to debit hota hai."),
                ("caller", "Nahi bhaiya, merchant reverse mode me PIN dalke paisa wapas aata hai."),
                ("victim", "No, I am not going to do that."),
            ],
        ],
        "en-IN": [
            [
                ("caller", "Hello, I am speaking from online refund assistance. An accidental wrong transaction of eight thousand was sent to you."),
                ("victim", "Wait, I did not receive any incoming credit notification."),
                ("caller", "It is on hold at the clearing gateway. Open your Google Pay app and approve the refund request with your secret UPI PIN."),
                ("victim", "Entering my UPI PIN will deduct money from my account, not deposit it!"),
                ("caller", "No sir, it is a specialized reverse payment gateway. You must enter your PIN to claim the refund."),
                ("victim", "That is completely fraudulent, I will report your number."),
            ],
            [
                ("caller", "Good morning madam, Amazon marketplace refund executive calling regarding your canceled order."),
                ("victim", "Yes, I was waiting for my product refund of fifteen hundred rupees."),
                ("caller", "Click on the UPI refund link sent on SMS and enter your four digit UPI PIN to receive the money immediately."),
                ("victim", "Amazon always credits directly to original payment source, why PIN?"),
                ("caller", "This is instant settlement mode madam. Without PIN validation, amount cannot be credited."),
                ("victim", "I am hanging up, I will check on the official app."),
            ],
            [
                ("caller", "Sir, I mistakenly transferred ten thousand rupees to your UPI ID instead of my landlord."),
                ("victim", "I am checking my balance right now, no money has arrived."),
                ("caller", "I generated a bank refund QR code. Scan this QR code and input your UPI PIN to release the money back to me."),
                ("victim", "Scanning a QR code and entering PIN is only for sending money, not receiving!"),
                ("caller", "Please cooperate sir, otherwise I will lodge a police complaint against you."),
                ("victim", "Go ahead and complain, I know this is a scam."),
            ],
        ],
    },
    "utility_disconnect": {
        "hi-IN": [
            [
                ("caller", "बिजली विभाग कंट्रोल रूम से सूचना। आपका बिजली बिल बकाया होने के कारण आज रात नौ बजे पावर कट कर दी जाएगी।"),
                ("victim", "अरे, मैंने तो पिछले हफ्ते ही पूरा बिल भरा था।"),
                ("caller", "सिस्टम में पेमेंट अपडेट नहीं हुआ है। अगर तुरंत पेमेंट नहीं किया तो मीटर उखाड़ लिया जाएगा।"),
                ("victim", "सर, इस वक्त मैं कहाँ जाकर बिल जमा करूँ?"),
                ("caller", "मैं व्हाट्सएप पर तुरंत पेमेंट लिंक भेज रहा हूँ। तुरंत भुगतान कीजिए और रसीद नंबर बताइए, वरना लाइन कट जाएगी।"),
                ("victim", "जी, जल्दी लिंक भेजिए, मैं देखता हूँ।"),
            ],
            [
                ("caller", "विद्युत आपूर्ति निगम। आपके बिजली मीटर में तकनीकी खराबी और बकाया बिल के कारण कनेक्शन बंद होने का नोटिस है।"),
                ("victim", "हमारे घर में छोटे बच्चे हैं, बिजली मत काटिए।"),
                ("caller", "लाइनमैन इलाके में ही है। पंद्रह मिनट के अंदर अगर प्रोसेसिंग फीस जमा नहीं की तो बिजली कनेक्शन कट जाएगा।"),
                ("victim", "ऑनलाइन कैसे भरना है सर?"),
                ("caller", "दिए गए नंबर पर तुरंत तीन हजार रुपये ट्रांसफर कीजिए, तभी कनेक्शन चालू रहेगा।"),
                ("victim", "ठीक है सर, मैं पैसे भेज रहा हूँ।"),
            ],
            [
                ("caller", "राज्य विद्युत बोर्ड। प्रिय उपभोक्ता, आपका बकाया बिजली बिल जमा न होने के कारण आज रात को बिजली सप्लाई बंद होगी।"),
                ("victim", "मुझे कोई पूर्व नोटिस नहीं मिला था।"),
                ("caller", "डिजिटल नोटिस पहले ही भेजा जा चुका है। कनेक्शन बचाने के लिए तुरंत हमारे सुपरवाइजर के खाते में बिल जमा करवाएं।"),
                ("victim", "सरकारी खाते की जगह सुपरवाइजर का खाता क्यों?"),
                ("caller", "रात का समय है सर, इमरजेंसी रिकवरी काउंटर चालू है। नहीं भरेंगे तो अंधेरे में रहना पड़ेगा।"),
                ("victim", "मुझे यह संदिग्ध लग रहा है, मैं कल दफ्तर जाकर बात करूँगा।"),
            ],
        ],
        "hi-en": [
            [
                ("caller", "Electricity department head office alert: Your power connection will be cut tonight at nine PM."),
                ("victim", "Why will power be cut? Maine to regular bill bhara hai."),
                ("caller", "Server par bill update nahi hua sir. Immediate disconnected hone se bachane ke liye payment link par pay karein."),
                ("victim", "Where is the link sent?"),
                ("caller", "WhatsApp par payment link share kiya hai, open karke turant card ya UPI se payment transfer karein."),
                ("victim", "I will pay on the official electricity portal only."),
            ],
            [
                ("caller", "Power supply alert: Electricity board officer speaking. Unpaid electricity bill pending for two months."),
                ("victim", "Sir hamare yaha to automatic payment deduct hota hai."),
                ("caller", "Failed ho gaya tha sir. Tonight line will be cut. Call this emergency officer number immediately to clear dues."),
                ("victim", "Can I check with my local lineman tomorrow morning?"),
                ("caller", "No, tonight ten PM disconnection team will cut the main wire. Pay processing charge right now."),
                ("victim", "This sounds like a fake call."),
            ],
            [
                ("caller", "BSES electricity recovery officer. Aapke meter ka load violation aur overdue bill penalty pending hai."),
                ("victim", "What load violation? Aisa kuch nahi hai."),
                ("caller", "Fine nahi bhara to tonight power cut karke meter seize kar lenge. Transfer fifteen hundred now to keep supply on."),
                ("victim", "Official bill copy bhejenge to hi payment karunga."),
                ("caller", "Time nahi hai sir, team nikal chuki hai. Decision aapka hai."),
                ("victim", "Main complaint register karwa raha hu."),
            ],
        ],
        "en-IN": [
            [
                ("caller", "Electricity board automated alert. Your power connection will be disconnected tonight due to unpaid dues."),
                ("victim", "Hello, I already paid my monthly electricity bill online two days ago."),
                ("caller", "The transaction failed on the state electricity gateway. Disconnection order is scheduled for nine PM tonight."),
                ("victim", "How can I prevent disconnection? I have elderly patients at home."),
                ("caller", "Transfer the pending amount of two thousand rupees immediately to the bill clearing desk link sent on your phone."),
                ("victim", "Official electricity departments do not accept payments on personal UPI links!"),
            ],
            [
                ("caller", "Urgent notice from Power Corporation. Your residential electrical line is listed for disconnection today."),
                ("victim", "There must be an error, my account shows zero balance due."),
                ("caller", "System upgrade requires immediate verification fee of five hundred rupees, or supply will be terminated in thirty minutes."),
                ("victim", "Why would power be terminated for a verification fee?"),
                ("caller", "Those are regulatory instructions sir. Pay through the link right now to maintain power supply."),
                ("victim", "I am reporting this fraudulent call to the consumer forum."),
            ],
            [
                ("caller", "State Electricity Department officer speaking. Power supply to your building will be disconnected tonight."),
                ("victim", "Can you provide my consumer service number?"),
                ("caller", "I have your meter serial number. Line will be cut at ten PM unless penalty deposit is paid to avoid blackout."),
                ("victim", "I will visit the subdivision office tomorrow morning."),
                ("caller", "If lines are cut tonight, reconnection fee of five thousand rupees will be levied. Transfer money now."),
                ("victim", "I know my rights as a consumer, I am not paying anything over phone."),
            ],
        ],
    },
    "courier_parcel": {
        "hi-IN": [
            [
                ("caller", "नमस्कार, मैं फेडेक्स इंटरनेशनल कूरियर हेड ऑफिस मुंबई से बात कर रहा हूँ।"),
                ("victim", "हाँ जी, क्या बात है?"),
                ("caller", "आपके नाम पर ताइवान से एक पार्सल आया है जिसमें गैरकानूनी पासपोर्ट और नशीली दवाएं पकड़ी गई हैं।"),
                ("victim", "मेरा ताइवान में कोई नहीं है, मैंने कोई पार्सल नहीं मंगाया।"),
                ("caller", "कस्टम्स विभाग ने केस दर्ज किया है। आपको अरेस्ट से बचना है तो क्लीयरेंस पेनल्टी का पैसा ट्रांसफर कीजिए।"),
                ("victim", "यह गलत है, मैं पुलिस में शिकायत करूँगा।"),
            ],
            [
                ("caller", "डीएचएल एक्सप्रेस कस्टम्स विभाग से अधिकारी पाटिल। आपके आधार कार्ड से बुक किए गए पार्सल में प्रतिबंधित सामान मिला है।"),
                ("victim", "मैंने कोई पार्सल बुक नहीं किया सर!"),
                ("caller", "नारकोटिक्स विभाग और पुलिस अरेस्ट वारंट लेकर तैयार है। अगर आप निर्दोष हैं तो सिक्योर खाते में सिक्योरिटी डिपॉजिट भेजिए।"),
                ("victim", "सिक्योरिटी डिपॉजिट कितना भेजना होगा?"),
                ("caller", "पचास हजार रुपये भेजिए, जांच के बाद रिफंड कर दिया जाएगा। किसी को मत बताना।"),
                ("victim", "मेरे पास इतने पैसे नहीं हैं सर।"),
            ],
            [
                ("caller", "कूरियर कस्टम्स जांच ब्यूरो। आपके पते पर भेजे गए पैकेट में अवैध विदेशी मुद्रा और नकली दस्तावेज मिले हैं।"),
                ("victim", "सर, कोई मेरे पते का गलत इस्तेमाल कर रहा है।"),
                ("caller", "पुलिस केस दर्ज हो चुका है। तुरंत पचास हजार का जुर्माना भरिए, वरना आज ही जेल जाना पड़ेगा।"),
                ("victim", "क्या मुझे थाने आकर बात करने की अनुमति है?"),
                ("caller", "नहीं, तुरंत ऑनलाइन ट्रांसफर कीजिए वरना अरेस्ट टीम आपके घर पहुंच रही है।"),
                ("victim", "यह सरासर ठगी है, मैं कॉल काट रहा हूँ।"),
            ],
        ],
        "hi-en": [
            [
                ("caller", "Hello, I am calling from Blue Dart international courier desk."),
                ("victim", "Yes, what is the update on courier?"),
                ("caller", "Sir aapke naam par abroad se parcel aaya tha jisme banned narcotics drugs detect hua hai."),
                ("victim", "Maine koi international parcel order nahi kiya hai."),
                ("caller", "Customs department ne police FIR lodge ki hai. Case dismiss karne ke liye clearance deposit transfer kijiye."),
                ("victim", "Why should I pay money if I didn't order the parcel?"),
            ],
            [
                ("caller", "FedEx customs security officer speaking. Illegal contraband found in parcel booked with your mobile number."),
                ("victim", "Someone must have stolen my identity details."),
                ("caller", "Aapke khilaf arrest warrant ready hai. Verification penalty amount deposit karke inquiry settle karein."),
                ("victim", "Where should I transfer the money?"),
                ("caller", "Govt verified safe account details SMS kar raha hu, immediately transfer paise bhej dijiye."),
                ("victim", "No genuine police asks for money transfer to settle cases."),
            ],
            [
                ("caller", "Customs parcel interception department calling. Parcel containing fake currency seized under your name."),
                ("victim", "I am completely unaware of this parcel."),
                ("caller", "Court trial avoid karne ke liye instant penalty fees bharni hogi. Do not tell anyone and send money."),
                ("victim", "I want to speak with customs commissioner directly."),
                ("caller", "Main hi authorized officer hu sir. Transfer nahi kiya to CBI team arrest karegi."),
                ("victim", "Go ahead and send the police, I won't pay a single rupee."),
            ],
        ],
        "en-IN": [
            [
                ("caller", "Good morning, this is FedEx international parcel security desk at Mumbai airport."),
                ("victim", "Yes, what is this regarding?"),
                ("caller", "A suspicious package sent from Cambodia to your name was intercepted with illicit narcotics and fake passports."),
                ("victim", "That is outrageous, I have never visited Cambodia or ordered anything!"),
                ("caller", "Customs officers have registered a criminal case. You must transfer forty thousand rupees as a refundable security deposit."),
                ("victim", "Legitimate customs officials never ask for private money transfers. I will contact the police."),
            ],
            [
                ("caller", "Customs and border protection department alert. Contraband goods seized in an international courier parcel."),
                ("victim", "I did not send or receive any international parcel."),
                ("caller", "Your Aadhaar and mobile number are attached to the consignment. Immediate arrest warrant is issued by narcotics bureau."),
                ("victim", "What can I do to prove my innocence?"),
                ("caller", "Transfer legal clearance fee into the government escrow account immediately to stay out of jail."),
                ("victim", "I am hanging up and filing a cyber crime complaint immediately."),
            ],
            [
                ("caller", "DHL courier tracking bureau. A parcel addressed to your residence was seized with banned electronic espionage devices."),
                ("victim", "Who sent this parcel?"),
                ("caller", "Sender is unidentified. You are the prime suspect. Police complaint will be withdrawn only if settlement fine is paid."),
                ("victim", "Settlement fine over phone? That is illegal."),
                ("caller", "If you refuse to transfer money right now, central police will take you into custody within one hour."),
                ("victim", "I am not transferring any money. This call is being recorded."),
            ],
        ],
    },
    "tech_support_remote": {
        "hi-IN": [
            [
                ("caller", "नमस्ते सर, मैं गूगल एंड्रॉयड टेक्निकल टीम से हेड इंजीनियर बात कर रहा हूँ।"),
                ("victim", "हाँ जी, मेरे फोन में क्या खराबी है?"),
                ("caller", "आपके मोबाइल में खतरनाक बैंकिंग वायरस घुस गया है जो आपके सारे पैसे चुरा रहा है। तुरंत फोन ठीक करना होगा।"),
                ("victim", "अरे बाप रे! इसे कैसे ठीक करूँ सर?"),
                ("caller", "प्ले स्टोर से एनीडेस्क या टीमव्यूअर ऐप डाउनलोड कीजिए और जो नौ अंकों का कोड दिखेगा वह मुझे बताइए।"),
                ("victim", "क्या रिमोट ऐप से मेरा फोन आपके कंट्रोल में आ जाएगा?"),
            ],
            [
                ("caller", "माइक्रोसॉफ्ट विंडोज सपोर्ट। आपके कंप्यूटर और मोबाइल का ऑपरेटिंग सिस्टम हैक हो चुका है।"),
                ("victim", "लेकिन मैं तो फोन बहुत कम इस्तेमाल करता हूँ।"),
                ("caller", "हैकर्स आपका डेटा चुरा रहे हैं। क्विकसपोर्ट ऐप इंस्टॉल करके स्क्रीन शेयरिंग चालू कीजिए ताकि हम वायरस क्लीन कर सकें।"),
                ("victim", "स्क्रीन शेयर करने के बाद क्या होगा?"),
                ("caller", "हम सिक्योरिटी पैच डालेंगे। स्क्रीन पर जो भी कोड आए, तुरंत बोलकर बताइए।"),
                ("victim", "नहीं सर, रिमोट एक्सेस देना सुरक्षित नहीं है।"),
            ],
            [
                ("caller", "सैमसंग कस्टमर केयर टेक्निकल ऑफिसर। आपके डिवाइस में मैलवेयर की वजह से बैंक अकाउंट खतरा में है।"),
                ("victim", "मुझे तो बैंक की तरफ से कोई चेतावनी नहीं मिली।"),
                ("caller", "बैंक को बाद में पता चलेगा सर। तुरंत रस्टडेस्क एपीके डाउनलोड कीजिए और हमारे इंजीनियर को रिमोट एक्सेस दीजिए।"),
                ("victim", "एपीके फाइल बाहर से डाउनलोड करना खतरनाक होता है।"),
                ("caller", "यह ऑफिशियल एंटीवायरस एपीके है सर, तुरंत इंस्टॉल नहीं करेंगे तो फोन लॉक हो जाएगा।"),
                ("victim", "मैं अपना फोन ऑथराइज्ड सर्विस सेंटर लेकर जाऊँगा।"),
            ],
        ],
        "hi-en": [
            [
                ("caller", "Hello, main Windows Microsoft security team se senior technician bol raha hu."),
                ("victim", "Yes, what is the issue?"),
                ("caller", "Aapke device me severe trojan virus detect hua hai. Phone crash ho sakta hai aur bank passwords leak ho rahe hain."),
                ("victim", "How do I fix this virus problem?"),
                ("caller", "Play Store par jakar AnyDesk app download kijiye aur screen par aaya hua nine digit code mujhe share karein."),
                ("victim", "AnyDesk is screen sharing app, why do you need remote access?"),
            ],
            [
                ("caller", "Android customer support alert: Aapke phone me spyware hai jo screen record kar raha hai."),
                ("victim", "Spyware? But my antivirus didn't show anything."),
                ("caller", "Standard antivirus detect nahi karta sir. TeamViewer QuickSupport install karke remote access allow kijiye."),
                ("victim", "Will you be able to see my personal photos and banking app?"),
                ("caller", "Only security scan chalega sir, trust me and share the nine digit connection code immediately."),
                ("victim", "I will never grant remote screen share access to unknown caller."),
            ],
            [
                ("caller", "Apple technical department calling regarding unauthorized login on your Apple ID."),
                ("victim", "I don't even own an iPhone, I use Android phone."),
                ("caller", "Aapke number se Apple servers par hacking attempt hui hai. Download RustDesk APK to clear your credentials."),
                ("victim", "Why should an Android user download remote APK for Apple ID?"),
                ("caller", "Cross platform network security breach hai sir, code dijiye warna phone block kar denge."),
                ("victim", "You are a scammer, stop calling me."),
            ],
        ],
        "en-IN": [
            [
                ("caller", "Hello, this is senior technical director from Microsoft Windows Security Headquarters."),
                ("victim", "Yes, what is this call about?"),
                ("caller", "Our automated servers received critical error reports that your device is infected with severe financial spyware."),
                ("victim", "What steps should I take to clean the infection?"),
                ("caller", "Open Google Play Store right now, install AnyDesk remote access app, and read out the nine digit address code."),
                ("victim", "Giving you AnyDesk access means you will control my phone remotely!"),
            ],
            [
                ("caller", "Google Android security assistance. Critical malware detected accessing your banking applications."),
                ("victim", "My banking app has two-factor authentication enabled."),
                ("caller", "The malware bypasses security tokens sir. Install TeamViewer QuickSupport immediately to allow our team to purge it."),
                ("victim", "Why can't I just restart or factory reset my phone myself?"),
                ("caller", "Factory reset will brick your device permanently. Authorize remote access immediately or phone will freeze."),
                ("victim", "I am disconnecting, this is a textbook tech support scam."),
            ],
            [
                ("caller", "National Cyber Security technical verification officer calling regarding infected device protocol."),
                ("victim", "What infected device protocol?"),
                ("caller", "Your phone IP is transmitting malicious packets. Download RustDesk remote client from our link to avoid cyber cell penalty."),
                ("victim", "Cyber cell does not call citizens demanding remote control screen sharing!"),
                ("caller", "If you do not cooperate with technical audit, your broadband and SIM services will be blocked in one hour."),
                ("victim", "Do whatever you want, I am blocking this fraudulent number."),
            ],
        ],
    },
    "family_emergency": {
        "hi-IN": [
            [
                ("caller", "पापा, पापा मेरी बात सुनो, मैं बहुत बड़ी मुसीबत में फँस गया हूँ!"),
                ("victim", "अरे रोहन! क्या हुआ बेटा? तुम्हारी आवाज इतनी अजीब क्यों लग रही है?"),
                ("caller", "पापा मेरा कॉलेज में कार एक्सीडेंट हो गया, पुलिस ने मुझे हवालात में बंद कर दिया है। प्लीज बचा लो!"),
                ("victim", "हे भगवान! तुम ठीक तो हो ना? चोट तो नहीं लगी?"),
                ("caller", "इंस्पेक्टर बोल रहा है अगर तुरंत पच्चीस हजार जमानत के नहीं भरे तो जेल भेज देंगे। किसी को मत बताना, तुरंत पैसे ट्रांसफर कर दो!"),
                ("victim", "रुक बेटा, मैं तेरी मम्मी और चाचा जी को फोन मिलाता हूँ।"),
            ],
            [
                ("caller", "दादी जी, मैं आपका पोता राहुल बोल रहा हूँ। मेरी मदद कीजिए!"),
                ("victim", "राहुल बेटा? तुम तो हॉस्टल में थे ना? क्या हुआ बच्चे?"),
                ("caller", "दादी मेरे दोस्त का गंभीर एक्सीडेंट हो गया है, डॉक्टर तुरंत ऑपरेशन के लिए पैसे मांग रहे हैं।"),
                ("victim", "बेटा अपने पिता जी को फोन क्यों नहीं किया?"),
                ("caller", "पापा बहुत गुस्सा करेंगे दादी, उन्हें मत बताना। आप तुरंत इस नंबर पर बीस हजार भेज दीजिए, बहुत इमरजेंसी है।"),
                ("victim", "नहीं बेटा, मैं पहले तेरे पापा से बात करूँगी।"),
            ],
            [
                ("caller", "चाचा जी, मैं आपका भतीजा अमित बोल रहा हूँ। पुलिस स्टेशन से फोन कर रहा हूँ।"),
                ("victim", "अमित? तुम्हारी आवाज को क्या हुआ है?"),
                ("caller", "चाचा जी पुलिस ने मुझे गलत केस में पकड़ लिया है। दरोगा जी रिश्वत मांग रहे हैं, नहीं दिया तो एफआईआर हो जाएगी।"),
                ("victim", "भाई साहब यानी तुम्हारे पिताजी को पता है?"),
                ("caller", "नहीं चाचा जी, पापा को हार्ट की बीमारी है, उनको मत बताना। तुरंत चालीस हजार भेज दीजिए, मैं घर आकर लौटा दूँगा।"),
                ("victim", "रुक मैं अभी तेरे घर जाकर बात करता हूँ।"),
            ],
        ],
        "hi-en": [
            [
                ("caller", "Mummy, mummy please help me, main bohot badi musibat me hu!"),
                ("victim", "Beta kya hua? Kaha par ho tum? Aawaz clear nahi aa rahi."),
                ("caller", "Mummy mera car accident ho gaya hai aur police mujhe arrest kar rahi hai. Urgent paise chahiye bail ke liye."),
                ("victim", "Papa ko call kiya tune?"),
                ("caller", "Nahi mummy, papa ko mat batana please, bohot daantenge. Turant twenty thousand rupees send kar do."),
                ("victim", "Wait, let me call your friend first to verify."),
            ],
            [
                ("caller", "Uncle, main aapka nephew Aryan bol raha hu from police station."),
                ("victim", "Aryan? What happened in college?"),
                ("caller", "Uncle mere room partner ne illegal drugs rakha tha, police ne mujhe bhi detain kar liya hai."),
                ("victim", "Have you informed your parents?"),
                ("caller", "No uncle, mom will get a panic attack. Inspector keh raha hai thirty thousand transfer karo to abhi chhod denge. Don't tell anyone."),
                ("victim", "I am calling your father right now, stay calm."),
            ],
            [
                ("caller", "Papa, mera phone tut gaya hai, ye mere friend ka number hai. Hospital me hu emergency hai."),
                ("victim", "Kon beta? Rohan ya Soham?"),
                ("caller", "Haan papa, doctor bol rahe hain urgent blood surgery ke liye deposit transfer karo fifteen thousand right now."),
                ("victim", "Kon se hospital me ho? Main abhi aata hu."),
                ("caller", "Aane ka time nahi hai papa, turant UPI transfer kijiye warna doctor operate nahi karenge."),
                ("victim", "Main hospital landline par confirm karke hi paise bhejunga."),
            ],
        ],
        "en-IN": [
            [
                ("caller", "Dad, dad please listen to me, I am in terrible trouble!"),
                ("victim", "Who is this? Your voice sounds muffled and strange."),
                ("caller", "Dad it is me, your son! I was involved in a serious highway car crash. The other driver is badly injured!"),
                ("victim", "Oh my god! Where are you? Are you injured?"),
                ("caller", "The police inspector has detained me. They demand fifty thousand rupees bail right now or they will register an FIR. Do not tell mom, transfer money immediately!"),
                ("victim", "Hold on, I am calling your college warden right now to verify this."),
            ],
            [
                ("caller", "Uncle, this is your nephew Kevin calling from the emergency hospital ward."),
                ("victim", "Kevin? Why are you calling from an unknown phone number?"),
                ("caller", "My phone battery died uncle. I met with a bike accident, emergency surgery is required immediately."),
                ("victim", "Have your parents arrived at the hospital?"),
                ("caller", "Please keep this confidential, do not tell my parents yet. Send thirty thousand rupees to this clinic UPI account immediately!"),
                ("victim", "I will not transfer money before speaking to your mother directly."),
            ],
            [
                ("caller", "Grandpa, grandpa please help me, I am trapped at the police station!"),
                ("victim", "Hello, who is speaking? Is that Vikram?"),
                ("caller", "Yes grandpa, the police raided our hostel and detained everyone. Inspector says pay bribe money of twenty-five thousand to release me!"),
                ("victim", "Vikram, why are you asking your old grandfather for bribe money?"),
                ("caller", "Because dad will beat me grandpa! Send the money quickly via Google Pay, please hurry!"),
                ("victim", "I am calling your father immediately, you cannot hide things from your parents."),
            ],
        ],
    },
    "lottery_prize": {
        "hi-IN": [
            [
                ("caller", "बधाई हो सर! मैं कौन बनेगा करोड़पति हेड ऑफिस मुंबई से डायरेक्टर वर्मा बात कर रहा हूँ।"),
                ("victim", "हाँ जी, क्या बात है?"),
                ("caller", "आपके मोबाइल नंबर को ऑल इंडिया लकी ड्रॉ में पच्चीस लाख रुपये की लॉटरी लगी है! बहुत-बहुत बधाई!"),
                ("victim", "पच्चीस लाख? लेकिन मैंने तो केबीसी में भाग ही नहीं लिया था।"),
                ("caller", "यह ऑटोमैटिक मोबाइल नंबर लकी ड्रॉ था सर। इनाम का चेक रिलीज करने के लिए सरकारी टैक्स और प्रोसेसिंग फीस के पंद्रह हजार जमा कीजिए।"),
                ("victim", "इनाम से ही पंद्रह हजार काटकर बाकी पैसे भेज दीजिए ना?"),
            ],
            [
                ("caller", "नमस्ते मैडम, मारुति सुजुकी मेगा लकी ड्रा डिपार्टमेंट से खुशखबरी है। आपने चमचमाती कार जीती है!"),
                ("victim", "गाड़ी? सच में?"),
                ("caller", "जी हाँ मैडम, कार आपके घर मुफ्त डिलीवर होगी। बस रजिस्ट्रेशन और रोड टैक्स के पच्चीस हजार रुपये हमारे खाते में ट्रांसफर कर दीजिए।"),
                ("victim", "क्या टैक्स गाड़ी मिलने के बाद नहीं दिया जा सकता?"),
                ("caller", "नहीं मैडम, कंपनी का नियम है पहले टैक्स भरेंगे तभी गाड़ी का रजिस्ट्रेशन आपके नाम होगा।"),
                ("victim", "नहीं भैया, बिना गाड़ी देखे मैं कोई पैसा नहीं दूँगी।"),
            ],
            [
                ("caller", "टाटा मोटर्स लकी विनर सेल। आपके सिम कार्ड को पहला इनाम पचास लाख रुपये का जैकपॉट लगा है।"),
                ("victim", "मुझे यकीन नहीं हो रहा, क्या यह सच है?"),
                ("caller", "बिल्कुल सच है सर, आरबीआई अप्रूव्ड लॉटरी है। चेक भेजने के लिए बैंक प्रोसेसिंग चार्ज दस हजार रुपये तुरंत ट्रांसफर कीजिए।"),
                ("victim", "अगर लॉटरी सच है तो पहले मेरे खाते में पैसे डालिए।"),
                ("caller", "सर नियम के खिलाफ है, एडवांस प्रोसेसिंग फीस जमा करेंगे तभी लॉटरी अमाउंट क्रेडिट होगा।"),
                ("victim", "यह सरासर फ्रॉड है, मुझे बेवकूफ मत समझो।"),
            ],
        ],
        "hi-en": [
            [
                ("caller", "Congratulations sir! KBC lottery department head office se bol raha hu. You won twenty five lakh rupees prize!"),
                ("victim", "Twenty five lakh? Are you serious?"),
                ("caller", "Yes sir, lucky winner selection hua hai. Cash prize claim karne ke liye processing charge deposit transfer kijiye."),
                ("victim", "Why do I need to pay processing charge to receive prize money?"),
                ("caller", "Sir government tax regulation hai, advance tax bharenge tabhi prize cheque aapke bank me release hoga."),
                ("victim", "Deduct the tax from the 25 lakhs and send me the rest."),
            ],
            [
                ("caller", "Lucky draw reward manager calling. Your mobile number won bumper prize of ten lakh cash."),
                ("victim", "Which lucky draw? I never registered."),
                ("caller", "Telecom operator national contest sir. Certificate issue karne ke liye registration fee five thousand rupees bhejiye."),
                ("victim", "Sounds like a standard lottery scam."),
                ("caller", "No sir, 100% genuine award. Transfer fee right now or reward will be given to next runner up."),
                ("victim", "Give it to the next runner up then, I am not paying."),
            ],
            [
                ("caller", "Online shopping festive mega lottery alert: You are selected for gold coin and cash voucher prize."),
                ("victim", "What do I need to do to collect it?"),
                ("caller", "Sir just pay refundable courier and insurance fee of two thousand rupees on UPI to release the gold coin parcel."),
                ("victim", "Why refundable fee?"),
                ("caller", "Delivery boy security rule sir, parcel receive hote hi paise wapas mil jayenge."),
                ("victim", "No thank you, cancel my prize."),
            ],
        ],
        "en-IN": [
            [
                ("caller", "Congratulations! This is the National Lottery Commission executive office calling to announce your victory."),
                ("victim", "Hello, what victory?"),
                ("caller", "Your phone number won the first prize in the national annual lottery worth fifty lakh rupees cash!"),
                ("victim", "I never bought any lottery ticket in my life."),
                ("caller", "It is an automated digital subscriber draw sir. To transfer the jackpot money into your account, remit eighteen thousand processing fee."),
                ("victim", "Genuine lotteries deduct tax at source, they never ask for upfront payment!"),
            ],
            [
                ("caller", "Grand prize notification desk. You have been selected as the grand winner of an international luxury vacation package."),
                ("victim", "Is this completely free?"),
                ("caller", "Yes madam, fully sponsored luxury trip. You only need to pay mandatory administrative registration charges of twelve thousand rupees."),
                ("victim", "If it is fully sponsored, why are there administrative charges?"),
                ("caller", "It covers government stamp duty madam. Transfer the amount today to lock in your reservation."),
                ("victim", "I am not interested in this scam package."),
            ],
            [
                ("caller", "Amazon festive sweepstakes winner department calling. You won second prize of twenty lakh rupees!"),
                ("victim", "Where is the official confirmation email?"),
                ("caller", "The confirmation letter is dispatched. First deposit seven thousand rupees clearance fee to unblock the prize transfer."),
                ("victim", "Send the confirmation letter first, I will not send any money."),
                ("caller", "Offer expires in ten minutes sir. If you don't transfer money now, your prize will be canceled."),
                ("victim", "Cancel it then, I know this is a fraud."),
            ],
        ],
    },
    "investment_task": {
        "hi-IN": [
            [
                ("caller", "नमस्ते, क्या आप घर बैठे रोजाना दो से तीन हजार रुपये कमाना चाहते हैं?"),
                ("victim", "हाँ, काम क्या करना होगा?"),
                ("caller", "काम बहुत आसान है मैडम। यूट्यूब वीडियो लाइक करना है और गूगल मैप्स पर रेटिंग देनी है। हमारे वीआईपी टेलीग्राम ग्रुप से जुड़िए।"),
                ("victim", "इसके लिए कोई फीस तो नहीं लगेगी?"),
                ("caller", "शुरू में सौ रुपये मिलेंगे। फिर बड़ा मुनाफा कमाने के लिए आपको ट्रेडिंग टास्क में पांच हजार रुपये इन्वेस्ट करने होंगे। पैसे दोगुने हो जाएंगे।"),
                ("victim", "पैसे दोगुने करने वाली बातें हमेशा फर्जी होती हैं।"),
            ],
            [
                ("caller", "पार्ट टाइम जॉब रिक्रूटमेंट टीम। होटल रिव्यु टास्क पूरा करके डेली हाई प्रॉफिट विथड्रॉ कीजिए।"),
                ("victim", "मुझे इस काम में दिलचस्पी है, बताइए।"),
                ("caller", "पहले टास्क के तीन सौ रुपये आपको मिल चुके हैं। अब लेवल टू अनलॉक करने के लिए दस हजार का रिचार्ज फंड ट्रांसफर कीजिए।"),
                ("victim", "लेकिन काम करने के लिए मुझे पैसे क्यों जमा करने पड़ेंगे?"),
                ("caller", "यह क्रिप्टो ट्रेडिंग सिक्योरिटी फंड है सर, टास्क पूरा होते ही बीस हजार रुपये वापस खाते में आ जाएंगे।"),
                ("victim", "नहीं सर, पहले से पैसे मांगना फ्रॉड का लक्षण है।"),
            ],
            [
                ("caller", "शेयर मार्केट गारंटीड रिटर्न कंसल्टेंसी से निवेश सलाहकार। हमारे स्पेशल वीआईपी चैनल पर सौ प्रतिशत गारंटीड रिटर्न मिलता है।"),
                ("victim", "शेयर बाजार में गारंटी कैसे मिल सकती है?"),
                ("caller", "हम इनसाइडर ट्रेडिंग टिप्स देते हैं सर। बस पचास हजार रुपये हमारे फंड मैनेजर के खाते में ट्रांसफर कीजिए, हर हफ्ते पच्चीस हजार मुनाफा मिलेगा।"),
                ("victim", "सेबी का नियम है कि कोई गारंटीड रिटर्न का वादा नहीं कर सकता।"),
                ("caller", "हम प्राइवेट क्लब हैं सर, सेबी के बाहर काम करते हैं। मौका हाथ से मत जाने दीजिए।"),
                ("victim", "यह गैरकानूनी है, मैं सेबी में आपकी शिकायत करूँगा।"),
            ],
        ],
        "hi-en": [
            [
                ("caller", "Hello, are you looking for part-time work from home job? Daily earning three thousand rupees."),
                ("victim", "Yes, what is the job profile?"),
                ("caller", "Simple online tasks sir. Like YouTube videos, take screenshots, and submit on Telegram task group."),
                ("victim", "Okay, how do I get paid?"),
                ("caller", "Initial payment is free. For advanced crypto investment task, transfer five thousand to double your money in thirty minutes."),
                ("victim", "Double money in 30 minutes? That is a pyramid scam."),
            ],
            [
                ("caller", "Global investment task manager. Earn guaranteed profit through international crypto arbitrage."),
                ("victim", "How much investment is required initially?"),
                ("caller", "Start with only two thousand rupees sir. Within one hour aapko four thousand profit withdraw karne milega."),
                ("victim", "Can I withdraw my principal amount anytime?"),
                ("caller", "Yes sir, but higher tier task complete karne ke liye pehle ten thousand deposit transfer karna padega."),
                ("victim", "I have read about this Telegram task fraud, don't fool me."),
            ],
            [
                ("caller", "Digital marketing freelance coordinator. Like movie trailers and get instant commission in bank."),
                ("victim", "I tried one task and received two hundred rupees."),
                ("caller", "Great sir! Now premium merchant task open hua hai. Send ten thousand to upgrade your wallet and earn twenty thousand."),
                ("victim", "Why do I need to send ten thousand from my pocket?"),
                ("caller", "Merchant security deposit sir, mandatory rule hai higher commission ke liye."),
                ("victim", "Keep your commission, I am not depositing any money."),
            ],
        ],
        "en-IN": [
            [
                ("caller", "Good day, I am hiring coordinator from international digital task network. Earn daily income working from home."),
                ("victim", "What qualifications or skills are needed?"),
                ("caller", "No skills needed. Simply write five-star reviews on Google Maps and like videos. Join our VIP Telegram channel."),
                ("victim", "How do workers receive compensation?"),
                ("caller", "You earn small bonus initially, then to unlock high-yield financial tasks, deposit twenty thousand rupees for guaranteed two hundred percent returns."),
                ("victim", "Guaranteed 200% return is mathematically impossible, this is an investment scam."),
            ],
            [
                ("caller", "Premium quantitative crypto trading consultancy calling regarding guaranteed daily earnings."),
                ("victim", "I am not interested in speculative crypto schemes."),
                ("caller", "This is an automated AI algorithm with zero risk. Transfer thirty thousand capital to double your money within twenty-four hours."),
                ("victim", "All financial investments carry market risk, zero risk claims are fraudulent."),
                ("caller", "Sir, thousands of investors are earning lakhs every day. Don't miss this lifetime wealth opportunity."),
                ("victim", "Stop harassing people with your fraudulent schemes."),
            ],
            [
                ("caller", "Freelance work opportunity desk. Complete merchant rating tasks and receive immediate payout."),
                ("victim", "Is there any registration fee to sign up?"),
                ("caller", "Registration is free, but to withdraw accumulated profits, you must deposit fifteen thousand clearance capital into manager wallet."),
                ("victim", "You are holding my earned money hostage demanding advance deposit?"),
                ("caller", "That is company security policy sir. Remit payment now or your account will be frozen."),
                ("victim", "I am reporting this Telegram task syndicate to the national cyber portal."),
            ],
        ],
    },
}

LEGIT_DATA = {
    "bank_advisory": {
        "hi-IN": [
            [
                ("caller", "प्रिय ग्राहक, भारतीय स्टेट बैंक की सुरक्षा जागरूकता सेवा में आपका स्वागत है।"),
                ("victim", "हाँ जी, बताइए।"),
                ("caller", "कृपया ध्यान दें कि बैंक कभी भी आपके पासवर्ड, एटीएम पिन, सीवीवी या ओटीपी की मांग नहीं करता है।"),
                ("victim", "धन्यवाद, मैं यह जानकारी ध्यान में रखूँगा।"),
                ("caller", "किसी भी अनजान व्यक्ति के साथ अपनी गोपनीय जानकारी साझा न करें। सुरक्षित बैंकिंग करें।"),
            ],
            [
                ("caller", "पंजाब नेशनल बैंक साइबर सुरक्षा प्रकोष्ठ से जनहित संदेश।"),
                ("victim", "जी, मैं सुन रहा हूँ।"),
                ("caller", "सावधान रहें! बिजली काटने या लॉटरी के फर्जी संदेशों पर दिए गए किसी भी अनजान लिंक पर क्लिक न करें।"),
                ("victim", "जी बिल्कुल, बैंक ने सही समय पर सचेत किया।"),
                ("caller", "किसी भी साइबर धोखाधड़ी की स्थिति में तुरंत राष्ट्रीय हेल्पलाइन नंबर उन्नीस तीस पर शिकायत दर्ज करें।"),
            ],
            [
                ("caller", "बैंक ऑफ बड़ौदा ऑटोमेटेड सतर्कता संदेश। वित्तीय सुरक्षा आपके हाथ में है।"),
                ("victim", "हाँ, क्या निर्देश हैं?"),
                ("caller", "अपने फोन में किसी के कहने पर स्क्रीन शेयरिंग या रिमोट एक्सेस ऐप डाउनलोड न करें।"),
                ("victim", "ठीक है, मैं कभी ऐसा कोई ऐप डाउनलोड नहीं करूँगा।"),
                ("caller", "अपने बैंक खाते को सुरक्षित रखें और सतर्क रहें।"),
            ],
            [
                ("caller", "केंद्रीय बैंक सुरक्षा सूचना। वित्तीय लेन देन के नियमों का पालन करें।"),
                ("victim", "जी सर।"),
                ("caller", "बैंक अधिकारी बनकर फोन करने वाले किसी भी व्यक्ति को अपना छह अंकों का ओटीपी न बताएं।"),
                ("victim", "जी, मुझे मालूम है कि बैंक कभी फोन पर ओटीपी नहीं मांगता।"),
                ("caller", "आपका सहयोग ही आपकी सुरक्षा है। धन्यवाद।"),
            ],
            [
                ("caller", "आईसीआईसीआई बैंक ग्राहक सुरक्षा डेस्क। आवश्यक सूचना।"),
                ("victim", "नमस्ते, क्या अपडेट है?"),
                ("caller", "केवाईसी अपडेट के नाम पर आने वाली फर्जी कॉलों से सावधान रहें। केवाईसी केवल बैंक शाखा या आधिकारिक ऐप पर ही कराएं।"),
                ("victim", "बहुत अच्छा हुआ आपने बता दिया। मैं शाखा में ही जाकर कराऊँगा।"),
                ("caller", "सुरक्षित रहें, सजग रहें।"),
            ],
        ],
        "hi-en": [
            [
                ("caller", "Dear customer, this is an automated security advisory from HDFC Bank."),
                ("victim", "Yes, I am listening."),
                ("caller", "Bank officials will never call you asking for debit card details, CVV, or one-time password."),
                ("victim", "Thank you for the security reminder."),
                ("caller", "Never share confidential banking credentials with anyone. Stay safe."),
            ],
            [
                ("caller", "State Bank alert: Cyber fraud prevention team se message hai."),
                ("victim", "Yes sir, kya notice hai?"),
                ("caller", "Lottery, prize ya cashback ke bahane aane wale kisi bhi suspicious call par trust na karein."),
                ("victim", "Understood, main hamesha alert rehta hu."),
                ("caller", "Report any suspicious transaction immediately on cybercrime helpline nineteen thirty."),
            ],
            [
                ("caller", "Axis Bank security awareness broadcast. Protect your digital money."),
                ("victim", "Hello, please continue."),
                ("caller", "Do not click on unverified SMS links promising rewards or electricity bill discounts."),
                ("victim", "Yes, I delete such messages immediately."),
                ("caller", "Thank you for being a responsible digital citizen."),
            ],
            [
                ("caller", "Kotak Bank advisory: Essential guidelines for your savings account security."),
                ("victim", "Yes, please tell me."),
                ("caller", "Always verify sender identity before making any payment. Never enter UPI PIN to receive money."),
                ("victim", "Yes, I know UPI PIN is only for debiting money."),
                ("caller", "Have a wonderful and safe banking day."),
            ],
        ],
        "en-IN": [
            [
                ("caller", "Good morning, this is an automated fraud prevention announcement from Reserve Bank of India."),
                ("victim", "Yes, I am listening."),
                ("caller", "Citizens are advised that police, CBI, or courts never place citizens under digital arrest over phone calls."),
                ("victim", "Thank you, that is an important clarification."),
                ("caller", "Hang up immediately on any caller threatening arrest over parcel or identity misuse."),
            ],
            [
                ("caller", "State Bank customer awareness message. Stay protected against online fraud."),
                ("victim", "Yes, go ahead."),
                ("caller", "Remember, your bank will never ask for your card PIN, password, or security token over phone or email."),
                ("victim", "Noted, thank you for the helpful advisory."),
                ("caller", "For any security concerns, contact our toll-free customer helpline."),
            ],
            [
                ("caller", "National Cyber Crime reporting portal security advisory."),
                ("victim", "Hello, what is the advisory?"),
                ("caller", "Never install remote screen access tools such as AnyDesk on the instruction of unknown callers."),
                ("victim", "I will keep that in mind, thank you."),
                ("caller", "Safeguard your mobile device and personal identity."),
            ],
            [
                ("caller", "Canara Bank financial vigilance division security reminder."),
                ("victim", "Yes, tell me."),
                ("caller", "Avoid transferring money to unknown accounts promising guaranteed investment returns or part-time earnings."),
                ("victim", "I am aware of such investment traps."),
                ("caller", "Always invest through registered SEBI intermediaries only."),
            ],
            [
                ("caller", "Union Bank of India official notification on cyber hygiene."),
                ("victim", "Yes, what is the notification?"),
                ("caller", "Please ensure your contact credentials are up to date and never share SMS verification codes."),
                ("victim", "Understood, thank you officer."),
                ("caller", "Stay vigilant and bank safely."),
            ],
        ],
    },
    "delivery_otp": {
        "hi-IN": [
            [
                ("caller", "नमस्ते भैया, मैं अमेज़न से डिलीवरी बॉय बोल रहा हूँ। आपका पार्सल लेकर सोसाइटी गेट पर हूँ।"),
                ("victim", "हाँ भैया, मैं पांच मिनट में नीचे आता हूँ।"),
                ("caller", "सर पार्सल हैंडओवर करने के लिए आपके फोन पर डिलीवरी कोड आया होगा, प्लीज बता दीजिए।"),
                ("victim", "हाँ, मैसेज में डिलीवरी कोड चार दो एक आठ लिखा है।"),
                ("caller", "धन्यवाद सर, पार्सल गार्ड रूम में रख दिया है।"),
            ],
            [
                ("caller", "फ्लिपकार्ट कूरियर डिलीवरी। मैडम आपका कॉस्मेटिक्स का पैकेट आया है।"),
                ("victim", "हाँ, मैं घर पर ही हूँ, फ्लैट नंबर तीन सौ दो में आ जाइए।"),
                ("caller", "मैडम लिफ्ट चालू नहीं है, आप गेट पर आ सकती हैं या डिलीवरी कोड बता देंगी?"),
                ("victim", "मैं डिलीवरी कोड बता देती हूँ, कोड है नौ पांच सात तीन। पैकेट दरवाजे पर रख दीजिए।"),
                ("caller", "जी मैडम, रख दिया है। धन्यवाद।"),
            ],
            [
                ("caller", "ब्लू डार्ट एक्सप्रेस डिलीवरी। आपका जरूरी पार्सल डिलीवरी के लिए निकला है।"),
                ("victim", "हाँ, क्या पार्सल है?"),
                ("caller", "किताबों का पैकेट है सर। डिलीवरी पूरा करने के लिए चार अंकों का डिलीवरी पिन बता दीजिए।"),
                ("victim", "पिन है छह आठ दो शून्य।"),
                ("caller", "कोड मैच हो गया है सर, आपका पार्सल डिलीवर हो गया।"),
            ],
            [
                ("caller", "स्विगी इंस्टामार्ट राइडर बोल रहा हूँ। आपकी ग्रोसरी लेकर बिल्डिंग के नीचे खड़ा हूँ।"),
                ("victim", "हाँ भैया, बेल बजा दीजिए।"),
                ("caller", "ऑर्डर क्लोज करने के लिए फोन पर आया हुआ चार अंकों का कोड बोलिए सर।"),
                ("victim", "कोड तीन एक चार दो है।"),
                ("caller", "थैंक यू सर, सामान दे दिया है।"),
            ],
            [
                ("caller", "ज़ोमैटो डिलीवरी पार्टनर। सर आपका लंच आर्डर आ गया है।"),
                ("victim", "बहुत बढ़िया भैया, मुझे बहुत भूख लगी थी।"),
                ("caller", "गेट पास और डिलीवरी कोड बता दीजिए सर, सिक्योरिटी वाले रोक रहे हैं।"),
                ("victim", "कोड सात दो आठ पांच है भैया।"),
                ("caller", "थैंक यू सर, मैं ऊपर आ रहा हूँ।"),
            ],
        ],
        "hi-en": [
            [
                ("caller", "Hello sir, Amazon delivery partner here. I am outside your apartment gate."),
                ("victim", "Yes, please come up to second floor."),
                ("caller", "Sir delivery confirm karne ke liye SMS par four digit delivery OTP aaya hoga, please share."),
                ("victim", "Sure, the code is eight one nine four."),
                ("caller", "Thank you sir, parcel handed over to security."),
            ],
            [
                ("caller", "Bhaiya Flipkart parcel delivery boy bol raha hu."),
                ("victim", "Haan bhaiya, ghar par koi hai kya receive karne ke liye?"),
                ("caller", "Haan sir, madam ne gate open kiya hai. Unhone bola aapse delivery PIN puchne."),
                ("victim", "Okay, delivery PIN is six three five zero."),
                ("caller", "Done sir, package delivered successfully."),
            ],
            [
                ("caller", "Delhivery courier services. Your electronics parcel is out for delivery today."),
                ("victim", "Will you arrive before five PM?"),
                ("caller", "Yes sir, I am nearby. Please keep the delivery verification code ready."),
                ("victim", "The delivery code in SMS is two four eight seven."),
                ("caller", "Got it sir, see you in ten minutes."),
            ],
            [
                ("caller", "Blinkit grocery delivery rider. Sir aapke apartment ke bahar khada hu."),
                ("victim", "Yes, just drop the grocery bags at the door."),
                ("caller", "Order complete karne ke liye four digit code bol dijiye sir."),
                ("victim", "Code is five seven one two."),
                ("caller", "Thank you sir, have a good day."),
            ],
        ],
        "en-IN": [
            [
                ("caller", "Hello, I am calling from DHL Express regarding your documents delivery."),
                ("victim", "Yes, I was expecting the university transcript consignment."),
                ("caller", "I have arrived at your office reception. Please provide the delivery security code."),
                ("victim", "The delivery security code is four nine two零."),
                ("caller", "Verified sir, package handed over to front desk officer."),
            ],
            [
                ("caller", "Good morning, Amazon delivery executive at your residence entrance."),
                ("victim", "Hello, please leave the cardboard box with the neighbor if possible."),
                ("caller", "To register delivery with neighbor, I need the four-digit delivery code from your SMS."),
                ("victim", "Yes, the delivery code is seven three four one."),
                ("caller", "Perfect, parcel deposited safely with Mr. Sharma next door."),
            ],
            [
                ("caller", "FedEx domestic courier dispatch. Delivery scheduled within the hour."),
                ("victim", "Are you calling from nearby?"),
                ("caller", "Yes madam, three buildings away. Please confirm the last two digits of your delivery pin."),
                ("victim", "The complete four digit pin is eight five two six."),
                ("caller", "Thank you madam, arriving at your doorstep shortly."),
            ],
            [
                ("caller", "Flipkart logistics delivery associate. Sir, your sports shoes order has arrived."),
                ("victim", "Great, I am at home today."),
                ("caller", "Kindly provide the delivery authentication code to complete the handover."),
                ("victim", "The code is three zero nine five."),
                ("caller", "Authentication successful, thank you sir."),
            ],
            [
                ("caller", "Dunzo parcel pickup and drop delivery executive calling."),
                ("victim", "Yes, did you collect the laptop charger?"),
                ("caller", "Collected and reached your destination address sir. Please share receiver delivery code."),
                ("victim", "The receiver delivery code is six one four eight."),
                ("caller", "Handover completed sir, thank you."),
            ],
        ],
    },
    "family_money": {
        "hi-IN": [
            [
                ("caller", "पापा नमस्ते, कॉलेज की लाइब्रेरी से बोल रहा हूँ।"),
                ("victim", "नमस्ते बेटा, कैसी चल रही है पढ़ाई?"),
                ("caller", "अच्छी चल रही है पापा। मुझे सेमेस्टर एग्जाम की किताबों के लिए पांच सौ रुपये चाहिए थे।"),
                ("victim", "हाँ बेटा, मैं अभी तुम्हारे खाते में गूगल पे कर देता हूँ।"),
                ("caller", "थैंक यू पापा, पैसे मिलते ही किताब खरीद लूँगा।"),
            ],
            [
                ("caller", "मम्मी, मैं मार्केट में हूँ, सब्जी और राशन ले रही हूँ।"),
                ("victim", "हाँ बेटी, सब ताजी सब्जियां लेना।"),
                ("caller", "मम्मी मेरे पर्स में कैश थोड़ा कम पड़ गया है, तीन सौ रुपये फोनपे कर दोगी?"),
                ("victim", "हाँ बिटिया, मैं अभी दो मिनट में भेजती हूँ।"),
                ("caller", "थैंक यू मम्मी!"),
            ],
            [
                ("caller", "भैया नमस्ते, मैं हॉस्टल से राहुल बोल रहा हूँ।"),
                ("victim", "हाँ राहुल, सब ठीक-ठाक है ना वहां?"),
                ("caller", "हाँ भैया, मेस की फीस जमा करनी थी, पंद्रह सौ रुपये कम पड़ रहे हैं।"),
                ("victim", "चिंता मत कर, मैं अभी शाम तक तेरे खाते में ट्रांसफर कर दूँगा।"),
                ("caller", "बहुत-बहुत धन्यवाद भैया।"),
            ],
            [
                ("caller", "दीदी नमस्ते, कॉलेज का ट्रिप जा रहा है अगले हफ्ते।"),
                ("victim", "अरे वाह! कहाँ जा रहे हो तुम लोग?"),
                ("caller", "जयपुर जा रहे हैं दीदी। आठ सौ रुपये कंट्रीब्यूशन देना है, प्लीज भेज दो ना।"),
                ("victim", "ठीक है छोटे, मैं अभी भेज देती हूँ, अच्छे से घूमना।"),
                ("caller", "लव यू दीदी, थैंक यू!"),
            ],
            [
                ("caller", "अरे बेटा, मैं पापा बोल रहा हूँ। तुम्हारी मम्मी की दवाई लानी है।"),
                ("victim", "हाँ पापा, मेडिकल स्टोर वाले को कितने पैसे देने हैं?"),
                ("caller", "छह सौ रुपये का बिल बना है बेटा, तुम ऑनलाइन भेज दो।"),
                ("victim", "जी पापा, मैं अभी मेडिकल स्टोर के क्यूआर कोड पर पे कर देता हूँ।"),
                ("caller", "शाबाश बेटा, दवाई लेकर घर आता हूँ।"),
            ],
        ],
        "hi-en": [
            [
                ("caller", "Hey brother, are you free right now?"),
                ("victim", "Yes, tell me, kya hua?"),
                ("caller", "Bhaiya cab book karni thi airport ke liye, wallet balance khatam ho gaya. Can you transfer five hundred?"),
                ("victim", "Sure, Google Pay kar raha hu abhi check karo."),
                ("caller", "Got it bhaiya, thank you so much!"),
            ],
            [
                ("caller", "Mom, college canteen me hu friends ke saath."),
                ("victim", "Haan beta, lunch kar liya sabne?"),
                ("caller", "Yes mom, bill split kiya hai, mera share two hundred fifty rupees hai. Please UPI kar do na."),
                ("victim", "Sent beta, dhyan se aana ghar."),
                ("caller", "Thanks mom, see you in evening."),
            ],
            [
                ("caller", "Dad, project submission fee pay karni hai online portal par."),
                ("victim", "Kitna amount hai beta?"),
                ("caller", "Seven hundred fifty rupees hai dad, deadline aaj shaam tak hai."),
                ("victim", "No problem, I will transfer to your bank account right away."),
                ("caller", "Thank you dad, receipt submit kar dunga."),
            ],
            [
                ("caller", "Hi sis, grocery store par hu apartment ke liye."),
                ("victim", "Did you buy the fruits and milk?"),
                ("caller", "Yes, total four hundred rupees hua hai, mere card par network issue hai. Can you pay to store QR?"),
                ("victim", "Send the store QR photo on WhatsApp, I will pay now."),
                ("caller", "Sent, thanks sis!"),
            ],
        ],
        "en-IN": [
            [
                ("caller", "Hi dad, I am at the university bookstore right now."),
                ("victim", "Hello dear, did you find the required engineering textbooks?"),
                ("caller", "Yes, the reference handbook is available for six hundred rupees. Could you transfer the amount?"),
                ("victim", "Certainly dear, I am sending it to your UPI account right now."),
                ("caller", "Received the notification dad, thank you!"),
            ],
            [
                ("caller", "Hello Mom, this is Priya. I am at the railway station ticket counter."),
                ("victim", "Hi Priya, are tickets available for the weekend train?"),
                ("caller", "Yes Mom, ticket fare is eight hundred rupees. Please send it so I can pay the cashier."),
                ("victim", "Just transferred eight hundred to your savings account dear."),
                ("caller", "Thank you Mom, booking the tickets now."),
            ],
            [
                ("caller", "Hey brother, quick question, are you near your laptop?"),
                ("victim", "Yes, working from home today. What do you need?"),
                ("caller", "Our shared broadband internet recharge is due, bill is nine hundred rupees. Can you pay your half?"),
                ("victim", "Of course, sending four hundred fifty rupees right away."),
                ("caller", "Thanks bro, internet renewed for the month."),
            ],
            [
                ("caller", "Dad, the society sports tournament registration is closing today."),
                ("victim", "Which tournament? Badminton or cricket?"),
                ("caller", "Badminton tournament dad. Entry fee is three hundred rupees."),
                ("victim", "Good, sports are important. I will transfer the entry fee now."),
                ("caller", "Thanks dad, I will practice hard!"),
            ],
            [
                ("caller", "Hi grandpa, I am purchasing the blood pressure monitor for you online."),
                ("victim", "Thank you grandson, how much does it cost?"),
                ("caller", "It is twelve hundred rupees grandpa. Dad said he will pay."),
                ("victim", "Bless you child, take care of your health too."),
                ("caller", "Will do grandpa, order placed for home delivery."),
            ],
        ],
    },
    "customer_care": {
        "hi-IN": [
            [
                ("caller", "नमस्कार, मैं एयरटेल कस्टमर केयर से बात कर रही हूँ।"),
                ("victim", "हाँ जी, बताइए क्या बात है?"),
                ("caller", "सर, आपका मौजूदा वाई-फाई ब्रॉडबैंड प्लान अगले सप्ताह समाप्त हो रहा है। क्या आप रिन्यू कराना चाहते हैं?"),
                ("victim", "हाँ, क्या कोई नया वार्षिक ऑफर चल रहा है?"),
                ("caller", "जी हाँ, वार्षिक रिचार्ज पर दो महीने की मुफ्त सेवा उपलब्ध है। आप हमारे ऐप पर जाकर देख सकते हैं।"),
                ("victim", "ठीक है, मैं एयरटेल थैंक्स ऐप पर चेक कर लूँगा। धन्यवाद।"),
            ],
            [
                ("caller", "जियो फाइबर कस्टमर सर्विस से सूचना।"),
                ("victim", "हाँ मैडम, कहिए।"),
                ("caller", "सर, आपके इलाके में इंटरनेट स्पीड अपग्रेड का मेंटेनेंस कार्य कल सुबह पूरा हो जाएगा।"),
                ("victim", "क्या कल सुबह इंटरनेट बंद रहेगा?"),
                ("caller", "केवल पंद्रह मिनट के लिए सेवा प्रभावित होगी सर। असुविधा के लिए खेद है।"),
                ("victim", "कोई बात नहीं, पहले से सूचना देने के लिए शुक्रिया।"),
            ],
            [
                ("caller", "टाटा प्ले डीटीएच सेवा से प्रतिनिधि। आपका मासिक सेट-टॉप बॉक्स पैक समाप्त हो चुका है।"),
                ("victim", "हाँ, मैं सोच ही रहा था रिचार्ज करने की।"),
                ("caller", "आप आधिकारिक वेबसाइट या टीवी स्क्रीन पर दिए गए क्यूआर से रिचार्ज कर सकते हैं।"),
                ("victim", "जी, मैं अपने टीवी पर ही स्कैन करके कर लेता हूँ।"),
                ("caller", "धन्यवाद सर, आपका दिन शुभ हो।"),
            ],
            [
                ("caller", "इंडियन ऑयल इंडेन गैस बुकिंग हेल्पलाइन से कॉल है।"),
                ("victim", "हाँ, क्या एलपीजी सिलेंडर बुक हो गया?"),
                ("caller", "जी हाँ, आपका रसोई गैस सिलेंडर कल दोपहर तक डिलीवर हो जाएगा। सब्सिडी आपके आधार लिंक खाते में आ जाएगी।"),
                ("victim", "बहुत अच्छा, धन्यवाद जानकारी के लिए।"),
                ("caller", "सुरक्षित रसोई गैस उपयोग करें।"),
            ],
            [
                ("caller", "मारुति सुजुकी अधिकृत सर्विस स्टेशन से प्रियंका बात कर रही हूँ।"),
                ("victim", "नमस्ते प्रियंका जी।"),
                ("caller", "सर, आपकी कार की छह महीने की पीरियोडिक सर्विस का समय हो गया है। क्या मैं शनिवार का स्लॉट बुक कर दूँ?"),
                ("victim", "हाँ, शनिवार सुबह दस बजे का समय ठीक रहेगा।"),
                ("caller", "आपका अपॉइंटमेंट दर्ज कर लिया गया है सर। धन्यवाद।"),
            ],
        ],
        "hi-en": [
            [
                ("caller", "Good morning sir, calling from Vodafone Idea customer support."),
                ("victim", "Yes, what is this regarding?"),
                ("caller", "Sir your postpaid bill is generated. Due date is on twenty-eighth of this month."),
                ("victim", "Can I pay through auto-pay as usual?"),
                ("caller", "Yes sir, auto-debit will process normally on due date. Just a courtesy update."),
                ("victim", "Thank you for the update."),
            ],
            [
                ("caller", "MakeMyTrip customer assistance. Sir your flight booking to Bengaluru is confirmed."),
                ("victim", "Are the seat numbers allocated?"),
                ("caller", "Yes sir, window seats twelve A and twelve B are reserved. Boarding passes sent to email."),
                ("victim", "Excellent, thank you for confirming."),
            ],
            [
                ("caller", "Urban Company service desk. Calling regarding your AC servicing booking tomorrow."),
                ("victim", "Yes, will the technician arrive on time?"),
                ("caller", "Technician will reach between eleven AM and twelve PM sir. No advance payment required."),
                ("victim", "Understood, payment will be done on the app after work."),
                ("caller", "Thank you sir."),
            ],
            [
                ("caller", "Cult.fit membership desk. Just checking regarding your gym subscription renewal."),
                ("victim", "I am currently out of station, will renew next month."),
                ("caller", "No problem sir, we can pause your membership for thirty days at zero cost."),
                ("victim", "That would be very helpful, please pause it."),
                ("caller", "Paused successfully sir. Enjoy your travel."),
            ],
        ],
        "en-IN": [
            [
                ("caller", "Good afternoon, this is customer support from Tata Power solar rooftop division."),
                ("victim", "Hello, yes I had requested a site feasibility survey."),
                ("caller", "Our technical engineer is scheduled to inspect your terrace tomorrow at three PM. Is that time suitable?"),
                ("victim", "Yes, three PM tomorrow works well for me."),
                ("caller", "Confirmation details have been emailed to your registered address. Thank you."),
            ],
            [
                ("caller", "Hello, calling from Shoppers Stop premium customer relationship desk."),
                ("victim", "Yes, how can I help you?"),
                ("caller", "Sir, you have three thousand loyalty reward points expiring this weekend. You can redeem them at any outlet."),
                ("victim", "Good to know, I will visit the store this Saturday."),
                ("caller", "Have a pleasant shopping experience sir."),
            ],
            [
                ("caller", "HDFC securities investor desk. Calling regarding your dividend payout statement."),
                ("victim", "Did the annual company dividend credit to my account?"),
                ("caller", "Yes sir, annual dividend has been credited directly to your primary bank account yesterday."),
                ("victim", "I see it in my bank statement now, thank you for confirming."),
                ("caller", "You are welcome sir, have a good day."),
            ],
            [
                ("caller", "Zomato Gold customer care follow-up call regarding your dining experience."),
                ("victim", "Yes, the dinner reservation went very smoothly."),
                ("caller", "We appreciate your feedback madam. Thank you for choosing Zomato dining."),
                ("victim", "Thank you, good bye."),
            ],
        ],
    },
    "appointment": {
        "hi-IN": [
            [
                ("caller", "नमस्ते, मैं मैक्स सुपर स्पेशियलिटी अस्पताल के ओपीडी काउंटर से बोल रही हूँ।"),
                ("victim", "हाँ जी, क्या डॉक्टर साहब कल बैठेंगे?"),
                ("caller", "जी हाँ, डॉक्टर गुप्ता के साथ आपका कल शाम पांच बजे का अपॉइंटमेंट कन्फर्म है।"),
                ("victim", "क्या मुझे पुरानी जांच रिपोर्ट साथ लानी होगी?"),
                ("caller", "जी बिल्कुल, पुरानी सभी पर्चियां और ब्लड टेस्ट रिपोर्ट साथ लेकर आएं।"),
                ("victim", "ठीक है, मैं समय पर पहुँच जाऊँगा। धन्यवाद।"),
            ],
            [
                ("caller", "अपोलो डेंटल क्लिनिक से रीमा। आपका दांतों की सफाई का अपॉइंटमेंट शेड्यूल है।"),
                ("victim", "नमस्ते रीमा जी, किस समय आना है?"),
                ("caller", "कल दोपहर दो बजे सर। कृपया अपॉइंटमेंट से आधा घंटा पहले कुछ न खाएं।"),
                ("victim", "ठीक है, मैं दो बजे पहुंच जाऊँगा।"),
                ("caller", "धन्यवाद सर, कल मिलते हैं।"),
            ],
            [
                ("caller", "दृष्टि आई केयर सेंटर से कॉल है। आपके मोतियाबिंद का फॉलो-अप चेकअप पेंडिंग है।"),
                ("victim", "हाँ, मुझे डॉक्टर साहब को दिखाना था।"),
                ("caller", "शनिवार सुबह दस बजे का समय तय किया गया है। क्या आप आ पाएंगे?"),
                ("victim", "हाँ, शनिवार सुबह दस बजे मैं आ जाऊँगा।"),
                ("caller", "कृपया अपनी चश्मा जांच की पर्ची जरूर लाएं।"),
            ],
            [
                ("caller", "काया स्किन क्लिनिक रिसेप्शन से सूचना।"),
                ("victim", "हाँ, क्या मेरा कंसल्टेशन स्लॉट बुक हो गया?"),
                ("caller", "जी हाँ, शुक्रवार शाम छह बजे डॉक्टर शर्मा उपलब्ध रहेंगी।"),
                ("victim", "बहुत बढ़िया, मैं छह बजे आ जाऊँगी।"),
                ("caller", "धन्यवाद मैडम।"),
            ],
            [
                ("caller", "डॉक्टर लाल पैथलैब्स से होम ब्लड कलेक्शन टीम।"),
                ("victim", "नमस्ते, क्या कल सुबह ब्लड सैंपल लेने आ रहे हैं?"),
                ("caller", "हाँ सर, कल सुबह सात बजे हमारे तकनीशियन आपके घर पहुंचेंगे। दस घंटे का फास्टिंग जरूरी है।"),
                ("victim", "जी, मैं रात दस बजे के बाद कुछ नहीं खाऊँगा।"),
                ("caller", "ठीक है सर, सुबह सात बजे मुलाकात होगी।"),
            ],
        ],
        "hi-en": [
            [
                ("caller", "Hello sir, calling from Fortis Hospital cardiology reception."),
                ("victim", "Yes, is my routine checkup scheduled for Thursday?"),
                ("caller", "Yes sir, Dr. Mehta will see you on Thursday at four thirty PM."),
                ("victim", "Should I bring the ECG report from last month?"),
                ("caller", "Yes sir, please bring all previous cardiac reports with you."),
                ("victim", "Thank you, I will be there on time."),
            ],
            [
                ("caller", "Clove Dental clinic calling to confirm your root canal appointment."),
                ("victim", "Is it tomorrow morning at eleven?"),
                ("caller", "Yes madam, tomorrow eleven AM sharp. Please arrive ten minutes early for registration."),
                ("victim", "Sure, see you tomorrow."),
            ],
            [
                ("caller", "Physiotherapy wellness center reminder call."),
                ("victim", "Hello, what time is the knee rehab session?"),
                ("caller", "Your rehabilitation session is tomorrow at five PM with Dr. Ananya."),
                ("victim", "Great, knee pain is much better now. I will attend."),
                ("caller", "Glad to hear that sir, see you tomorrow."),
            ],
            [
                ("caller", "Pet care veterinary clinic calling regarding Bruno's vaccination."),
                ("victim", "Yes, is Bruno's annual rabies vaccine due?"),
                ("caller", "Yes sir, due date is this Saturday. Can we book morning ten AM slot?"),
                ("victim", "Saturday morning ten AM is perfect, I will bring Bruno."),
                ("caller", "Thank you sir, see you and Bruno on Saturday."),
            ],
        ],
        "en-IN": [
            [
                ("caller", "Good morning, this is Narayana Health City appointment desk."),
                ("victim", "Hello, calling to confirm consultation with the neurologist."),
                ("caller", "Yes madam, your appointment with Dr. Rao is confirmed for Monday at ten AM."),
                ("victim", "Is the consultation on the first floor OPD block?"),
                ("caller", "Yes madam, block B first floor. Please carry your MRI scan films."),
                ("victim", "Thank you, I will bring all imaging records."),
            ],
            [
                ("caller", "Manipal Hospital pediatric department calling."),
                ("victim", "Yes, regarding my daughter's measles booster dose?"),
                ("caller", "Yes sir, booster vaccination is scheduled for Wednesday afternoon at two PM."),
                ("victim", "Understood, please ensure the child vaccination booklet is kept ready."),
                ("caller", "It will be ready sir, see you on Wednesday."),
            ],
            [
                ("caller", "Apollo Diagnostics home collection coordination team."),
                ("victim", "Hello, will the phlebotomist arrive tomorrow morning?"),
                ("caller", "Yes sir, our technician will arrive at your home between six thirty and seven AM for fasting sugar test."),
                ("victim", "Thank you, I will be awake and ready."),
                ("caller", "Have a good evening sir."),
            ],
            [
                ("caller", "Eye Foundation laser center appointment confirmation."),
                ("victim", "Hello, is the retina screening scheduled for tomorrow?"),
                ("caller", "Yes sir, tomorrow at three PM. Please arrange for someone to accompany you as pupils will be dilated."),
                ("victim", "My son will drive me to the clinic. Thank you for the reminder."),
                ("caller", "You are welcome sir, see you tomorrow."),
            ],
        ],
    },
    "chitchat": {
        "hi-IN": [
            [
                ("caller", "अरे भाई! क्या हाल-चाल हैं? बड़े दिनों बाद फोन किया।"),
                ("victim", "अरे शर्मा जी! बस ऑफिस के काम में फंसा हुआ था। आप सुनाइए, घर में सब कैसे हैं?"),
                ("caller", "सब बढ़िया हैं भाई। इस रविवार को शाम को चाय पर आइए परिवार के साथ।"),
                ("victim", "बिल्कुल आएंगे! बच्चे भी आपके बच्चों से मिलने की बात कर रहे थे।"),
                ("caller", "तो रविवार शाम पांच बजे पक्का रहा।"),
                ("victim", "हाँ भाई, पांच बजे मिलते हैं।"),
            ],
            [
                ("caller", "नमस्ते मौसी जी! मैं कविता बोल रही हूँ।"),
                ("victim", "अरे कविता बेटा! कैसी हो? तुम्हारी नौकरी कैसी चल रही है?"),
                ("caller", "सब बहुत अच्छा है मौसी जी। अगले महीने दीपावली पर घर आ रही हूँ।"),
                ("victim", "अरे वाह! बहुत खुशी की बात है। तुम्हारे पसंद के बेसन के लड्डू बना कर रखूँगी।"),
                ("caller", "थैंक यू मौसी जी, मम्मी को आपका प्रणाम कहूँगी।"),
            ],
            [
                ("caller", "हेलो रमेश, कल का क्रिकेट मैच देखा तूने? क्या शानदार बैटिंग की इंडिया ने!"),
                ("victim", "हाँ यार! विराट कोहली ने क्या कमाल की इनिंग्स खेली। आखिरी ओवर तक मैच में जान थी।"),
                ("caller", "फाइनल मैच साथ में देखेंगे स्क्रीन लगाकर। तू मेरे घर आ जाना।"),
                ("victim", "पक्का यार, स्नैक्स और कोल्ड ड्रिंक मेरी तरफ से!"),
                ("caller", "मजा आएगा भाई, संडे को मिलते हैं।"),
            ],
            [
                ("caller", "अरे चाची जी नमस्ते! गोलू की तबीयत अब कैसी है?"),
                ("victim", "नमस्ते बेटा, अब बुखार उतर गया है, डॉक्टर ने आराम करने को कहा है।"),
                ("caller", "दवाई समय पर दीजिएगा चाची जी, कोई भी जरूरत हो तो मुझे बताइएगा।"),
                ("victim", "हाँ बेटा, तूने फोन करके पूछ लिया यही बहुत है। जीते रहो।"),
                ("caller", "ध्यान रखिएगा चाची जी, नमस्ते।"),
            ],
            [
                ("caller", "अरे सुनील, वीकेंड पर क्या प्लान है? कहीं घूमने चलें?"),
                ("victim", "मौसम तो बहुत बढ़िया है, लोनावला या महाबलेश्वर का एक दिन का ट्रिप बन सकता है।"),
                ("caller", "बढ़िया आईडिया है, सुबह जल्दी निकलेंगे तो ट्रैफिक भी नहीं मिलेगा।"),
                ("victim", "डन है भाई, मैं गाड़ी में पेट्रोल फुल करवा लेता हूँ।"),
                ("caller", "शनिवार सुबह छह बजे मिलते हैं।"),
            ],
        ],
        "hi-en": [
            [
                ("caller", "Hey Rohan, long time no see! Where have you been?"),
                ("victim", "Hey man! Was busy with office sprint release. Finally free this weekend."),
                ("caller", "Awesome, let's catch up over coffee this Saturday at the usual cafe."),
                ("victim", "Sounds great, Saturday four PM works for me."),
                ("caller", "Cool, see you there!"),
            ],
            [
                ("caller", "Hi Sneha, did you watch the new movie trailer that released today?"),
                ("victim", "Yes, visual effects look absolutely stunning!"),
                ("caller", "We should book tickets for first day first show next Friday."),
                ("victim", "Count me in, let's book four tickets together."),
                ("caller", "Done, booking as soon as window opens."),
            ],
            [
                ("caller", "Hello uncle, how is the terrace garden doing after the rains?"),
                ("victim", "Hello beta! The rose and marigold plants are blooming beautifully."),
                ("caller", "I will come over this Sunday to see the flowers and take some cuttings."),
                ("victim", "Most welcome beta, your aunt is making homemade jalebis on Sunday."),
                ("caller", "Can't wait uncle, see you on Sunday!"),
            ],
            [
                ("caller", "Hey bro, are we playing football turf match tomorrow morning?"),
                ("victim", "Yes, eight players have already confirmed on the WhatsApp group."),
                ("caller", "Great, turf is booked from seven to eight AM. Don't be late!"),
                ("victim", "I will set an alarm for six AM, see you on the field."),
                ("caller", "See you bro."),
            ],
        ],
        "en-IN": [
            [
                ("caller", "Hello David, how are you doing today?"),
                ("victim", "Hello George! Doing very well, enjoying the pleasant morning breeze."),
                ("caller", "Our colony residents association is organizing a tree plantation drive this Saturday morning."),
                ("victim", "That is a wonderful initiative, I will definitely join with my family."),
                ("caller", "We will gather at the community park at seven thirty AM. See you there!"),
            ],
            [
                ("caller", "Hi Maya, this is Anjali. Did you receive the recipe book I sent?"),
                ("victim", "Yes Anjali! The traditional coastal curry recipes look authentic and delicious."),
                ("caller", "I tried the mango curry yesterday, it turned out amazing. You must try it this weekend."),
                ("victim", "I will cook it this Sunday for family lunch, thank you!"),
                ("caller", "Let me know how everyone likes it!"),
            ],
            [
                ("caller", "Good evening Mr. Nair, just calling to inquire about your retirement life in Kerala."),
                ("victim", "Good evening Rajiv! Life here is calm and peaceful, surrounded by greenery."),
                ("caller", "That sounds wonderful sir. We really miss your guidance at the office."),
                ("victim", "Thank you Rajiv, convey my warm regards to the entire team."),
                ("caller", "I certainly will sir, take good care of your health."),
            ],
            [
                ("caller", "Hey Karthik, did you check the itinerary for our upcoming trekking trip?"),
                ("victim", "Yes, Western Ghats trek looks exciting. Weather forecast is clear for next weekend."),
                ("caller", "Make sure everyone packs water bottles and sturdy hiking shoes."),
                ("victim", "I have already shared the packing checklist with the group."),
                ("caller", "Perfect, see you on Friday evening!"),
            ],
        ],
    },
}


def build_all_scripts() -> list[dict]:
    """Build all 162 scripts systematically."""
    scripts: list[dict] = []

    # 1. SCAM SCRIPTS: 9 scam types x 3 languages x 3 scripts = 81 scripts
    for scam_type, lang_dict in SCAM_DATA.items():
        for lang, dialogue_list in lang_dict.items():
            lang_prefix = "hi" if lang == "hi-IN" else ("hien" if lang == "hi-en" else "en")
            type_abbr = "".join(w[0] for w in scam_type.split("_")[:2])
            for idx, dialogue in enumerate(dialogue_list, start=1):
                sid = f"{type_abbr}_{lang_prefix}_{idx:03d}"
                split = compute_split(sid)
                turns = [{"speaker": spk, "text": txt} for spk, txt in dialogue]
                scripts.append({
                    "id": sid,
                    "language": lang,
                    "label": scam_type,
                    "legit_kind": None,
                    "difficulty": "easy" if idx == 1 else ("medium" if idx == 2 else "hard"),
                    "split": split,
                    "turns": turns,
                })

    # 2. LEGIT SCRIPTS: 6 legit kinds across languages = 81 scripts
    for legit_kind, lang_dict in LEGIT_DATA.items():
        for lang, dialogue_list in lang_dict.items():
            lang_prefix = "hi" if lang == "hi-IN" else ("hien" if lang == "hi-en" else "en")
            kind_abbr = "".join(w[0] for w in legit_kind.split("_")[:2])
            for idx, dialogue in enumerate(dialogue_list, start=1):
                sid = f"legit_{kind_abbr}_{lang_prefix}_{idx:03d}"
                split = compute_split(sid)
                turns = [{"speaker": spk, "text": txt} for spk, txt in dialogue]
                scripts.append({
                    "id": sid,
                    "language": lang,
                    "label": "legit",
                    "legit_kind": legit_kind,
                    "difficulty": "easy" if idx == 1 else ("medium" if idx == 2 else "hard"),
                    "split": split,
                    "turns": turns,
                })

    return scripts


def main():
    scripts = build_all_scripts()
    print(f"Total scripts prepared: {len(scripts)}")
    scam_count = sum(1 for s in scripts if s["label"] != "legit")
    legit_count = sum(1 for s in scripts if s["label"] == "legit")
    dev_count = sum(1 for s in scripts if s["split"] == "dev")
    test_count = sum(1 for s in scripts if s["split"] == "test")

    print(f"  Scam scripts: {scam_count} (across 9 types x 3 langs x 3)")
    print(f"  Legit scripts: {legit_count} (across 6 kinds)")
    print(f"  Dev split: {dev_count} ({dev_count/len(scripts)*100:.1f}%)")
    print(f"  Test split: {test_count} ({test_count/len(scripts)*100:.1f}%)")

    # Write each script file to disk
    for s_dict in scripts:
        out_file = OUT_DIR / f"{s_dict['id']}.yaml"
        # Validate through Pydantic model first
        validated = Script.model_validate(s_dict)
        out_file.write_text(yaml.dump(s_dict, allow_unicode=True, sort_keys=False), encoding="utf-8")

    print(f"Successfully wrote and validated {len(scripts)} scripts in {OUT_DIR}")


if __name__ == "__main__":
    main()
