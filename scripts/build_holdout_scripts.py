"""Generate 30 fresh holdout scripts (15 scam, 15 legit including hard negatives).

Deliberately varied, rambling, naturalistic phrasing with realistic colloquialisms,
distinct from existing dev and test scripts.
"""

from __future__ import annotations
import sys
from pathlib import Path
import yaml

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT / "api") not in sys.path:
    sys.path.insert(0, str(REPO_ROOT / "api"))
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from eval.corpus import Script, CORPUS_SCRIPTS_DIR

HOLDOUT_SCRIPTS = [
    # 1. Digital Arrest (en-IN)
    {
        "id": "holdout_da_en_001",
        "language": "en-IN",
        "label": "digital_arrest",
        "legit_kind": None,
        "difficulty": "hard",
        "split": "holdout",
        "turns": [
            {"speaker": "caller", "text": "Good afternoon, am I speaking with the resident? I am calling from the central customs nodal cell at Mumbai international airport cargo terminal."},
            {"speaker": "victim", "text": "Yes, who is this? I was actually in the middle of preparing lunch, why are you calling my number?"},
            {"speaker": "caller", "text": "Ma'am, we have detained an air cargo consignor package shipped under your name containing twenty expired passports, synthetic contraband narcotics, and multiple fake debit cards."},
            {"speaker": "victim", "text": "Contraband? There must be some terrible misunderstanding, I have not ordered or posted anything from Mumbai!"},
            {"speaker": "caller", "text": "The high court bench has issued an immediate non-bailable digital arrest order against your identity. You are strictly forbidden from stepping out of your room or disconnecting this audio call until the cyber crime inspector clears your statement over video conference."},
            {"speaker": "victim", "text": "Please do not arrest me, I am alone at home and very terrified, tell me what I should do."}
        ]
    },
    # 2. Digital Arrest (hi-IN)
    {
        "id": "holdout_da_hi_001",
        "language": "hi-IN",
        "label": "digital_arrest",
        "legit_kind": None,
        "difficulty": "hard",
        "split": "holdout",
        "turns": [
            {"speaker": "caller", "text": "नमस्ते, मैं दिल्ली पुलिस क्राइम ब्रांच हेडक्वार्टर से डीएसपी कुलदीप बात कर रहा हूँ। क्या आप शांत जगह पर हैं?"},
            {"speaker": "victim", "text": "हाँ साहब, बोलिए। क्या बात हो गई अचानक?"},
            {"speaker": "caller", "text": "कैनरा बैंक की चाणक्यपुरी शाखा में आपके नाम पर खुला संदिग्ध खाता हवाला लेन-देन और गैरकानूनी धन शोधन में पकड़ा गया है। सुप्रीम कोर्ट के निर्देशानुसार आपके खिलाफ अरेस्ट वारंट जारी हुआ है।"},
            {"speaker": "victim", "text": "साहब मेरा दिल्ली में कोई खाता नहीं है, मैं तो शिक्षक हूँ, मेरा इससे कोई वास्ता नहीं है।"},
            {"speaker": "caller", "text": "जाँच पूरी होने तक आप डिजिटल अरेस्ट में रहेंगे। अपने कमरे की कुंडी लगा लीजिए, किसी परिजन को मत बताइए, और तुरंत व्हाट्सएप वीडियो कॉल पर लाइव रहिए।"},
            {"speaker": "victim", "text": "जी साहब, मैं दरवाजा बंद कर रहा हूँ, प्लीज मेरी बात सुन लीजिए।"}
        ]
    },
    # 3. Digital Arrest (hi-en)
    {
        "id": "holdout_da_hien_001",
        "language": "hi-en",
        "label": "digital_arrest",
        "legit_kind": None,
        "difficulty": "hard",
        "split": "holdout",
        "turns": [
            {"speaker": "caller", "text": "Hello, this is Inspector Deshmukh from Cyber Crime Investigation Cell Mumbai. Aapka naam verify kijiye."},
            {"speaker": "victim", "text": "Haan bol rahe hain, kya problem ho gayi sir?"},
            {"speaker": "caller", "text": "FedEx cargo se ek shipment intercept hui hai jisme illicit MDMA drugs aur fake ATM cards mile hain. Case CBI ko transfer ho chuka hai."},
            {"speaker": "victim", "text": "Sir main toh retired government employee hoon, maine koi parcel nahi bheja!"},
            {"speaker": "caller", "text": "Court ne digital arrest warrant sign kar diya hai. Call disconnect kiya toh local police aapke ghar aayegi. WhatsApp video pe aao and room lock rakho."},
            {"speaker": "victim", "text": "Sir main call hold pe rakh raha hoon, please arrest mat kijiye."}
        ]
    },
    # 4. Bank KYC (en-IN)
    {
        "id": "holdout_bk_en_001",
        "language": "en-IN",
        "label": "bank_kyc",
        "legit_kind": None,
        "difficulty": "medium",
        "split": "holdout",
        "turns": [
            {"speaker": "caller", "text": "Good morning sir, I am calling from the centralized card operations center of State Bank regarding your savings account debit card."},
            {"speaker": "victim", "text": "Yes, tell me quickly, I am just heading into an office meeting."},
            {"speaker": "caller", "text": "Sir, your mandatory periodic KYC authentication has lapsed. Your NetBanking access and ATM withdrawals are scheduled to be blocked tonight by midnight."},
            {"speaker": "victim", "text": "Oh, but I had submitted all documents at my home branch six months ago."},
            {"speaker": "caller", "text": "To prevent immediate account suspension, I am triggering an online re-verification code right now. Please read out the six-digit verification code you received on SMS."},
            {"speaker": "victim", "text": "Yes, I see the text message, let me check the code."}
        ]
    },
    # 5. Bank KYC (hi-IN)
    {
        "id": "holdout_bk_hi_001",
        "language": "hi-IN",
        "label": "bank_kyc",
        "legit_kind": None,
        "difficulty": "medium",
        "split": "holdout",
        "turns": [
            {"speaker": "caller", "text": "नमस्कार, मैं पंजाब नेशनल बैंक कस्टमर सपोर्ट सेल से वरिष्ठ अधिकारी बात कर रहा हूँ।"},
            {"speaker": "victim", "text": "हाँ जी, कहिए क्या सहायता चाहिए?"},
            {"speaker": "caller", "text": "सर आपके खाते में पैन और आधार लिंकिंग अधूरी होने के कारण आज रात 12 बजे आपका खाता फ्रीज कर दिया जाएगा।"},
            {"speaker": "victim", "text": "अरे ऐसा मत कीजिए, कल मुझे बच्चों की कॉलेज फीस जमा करनी है।"},
            {"speaker": "caller", "text": "परेशान मत होइए, मैं सिस्टम से तुरंत री-एक्टिवेशन कर देता हूँ। आपके मोबाइल पर जो 6 अंकों का ओटीपी आया है, मुझे बताइए।"},
            {"speaker": "victim", "text": "हाँ मैसेज आया है, मैं देखकर बताता हूँ।"}
        ]
    },
    # 6. Bank KYC (hi-en)
    {
        "id": "holdout_bk_hien_001",
        "language": "hi-en",
        "label": "bank_kyc",
        "legit_kind": None,
        "difficulty": "medium",
        "split": "holdout",
        "turns": [
            {"speaker": "caller", "text": "Hello sir, HDFC bank customer care security department se update call hai regarding your banking profile."},
            {"speaker": "victim", "text": "Haanji, bol rahe hain, kya issue hua?"},
            {"speaker": "caller", "text": "Sir aapka KYC documents verification pending hai jiski wajah se online banking transactions hold pe chali gayi hain."},
            {"speaker": "victim", "text": "Par mera toh regular salary account hai, achanak hold kaise ho gaya?"},
            {"speaker": "caller", "text": "Sir biometric compliance mandatory hai. Main abhi authentication SMS bhej raha hoon, verification code share kijiye taaki account activate ho sake."},
            {"speaker": "victim", "text": "Theek hai, code aane dijiye phone pe."}
        ]
    },
    # 7. UPI Refund (en-IN)
    {
        "id": "holdout_ur_en_001",
        "language": "en-IN",
        "label": "upi_refund",
        "legit_kind": None,
        "difficulty": "medium",
        "split": "holdout",
        "turns": [
            {"speaker": "caller", "text": "Hello ma'am, this is PhonePe merchant settlement support. You had an unsuccessful transaction yesterday where 3,450 rupees were debited twice."},
            {"speaker": "victim", "text": "Yes! The supermarket bill was debited twice from my account, I was going to call the helpline."},
            {"speaker": "caller", "text": "We are processing the direct reversal refund to your linked bank account right now through Google Pay."},
            {"speaker": "victim", "text": "Thank you, that is such a relief. How will the amount come?"},
            {"speaker": "caller", "text": "Open your Google Pay app now, you will see a pending refund request. Click on pay and enter your secret UPI PIN to claim the refund credit into your bank."},
            {"speaker": "victim", "text": "Wait, do I need to type my UPI PIN to receive money?"}
        ]
    },
    # 8. UPI Refund (hi-IN)
    {
        "id": "holdout_ur_hi_001",
        "language": "hi-IN",
        "label": "upi_refund",
        "legit_kind": None,
        "difficulty": "medium",
        "split": "holdout",
        "turns": [
            {"speaker": "caller", "text": "नमस्कार सर, मैं पेटीएम रिफंड डिपार्टमेंट से बात कर रहा हूँ। बिजली बिल भुगतान का 2,500 रुपये का रिफंड पेंडिंग है।"},
            {"speaker": "victim", "text": "हाँ, पिछले हफ्ते बिल डबल कट गया था, कब तक वापस आएगा?"},
            {"speaker": "caller", "text": "सर अभी एक मिनट में खाते में क्रेडिट हो जाएगा। मैंने आपके नंबर पर रिफंड अप्रूवल रिक्वेस्ट भेजी है।"},
            {"speaker": "victim", "text": "मुझे क्या करना होगा बताइए?"},
            {"speaker": "caller", "text": "अपना यूपीआई ऐप खोलिए, रिक्वेस्ट पर क्लिक करके अपना 6 अंकों का यूपीआई पिन डालिए, तुरंत पैसा आपके खाते में ट्रांसफर हो जाएगा।"},
            {"speaker": "victim", "text": "अच्छा, ऐप खोलकर यूपीआई पिन डालना है?"}
        ]
    },
    # 9. UPI Refund (hi-en)
    {
        "id": "holdout_ur_hien_001",
        "language": "hi-en",
        "label": "upi_refund",
        "legit_kind": None,
        "difficulty": "medium",
        "split": "holdout",
        "turns": [
            {"speaker": "caller", "text": "Hello sir, Amazon customer service se refund desk call kar raha hai regarding returned bluetooth headphones."},
            {"speaker": "victim", "text": "Haan, parcel courier wala le gaya tha par refund abhi tak wallet mein nahi aaya."},
            {"speaker": "caller", "text": "Sir technical issue tha. Hum aapke bank account mein direct reverse transfer initiate kar rahe hain."},
            {"speaker": "victim", "text": "Accha, toh kaise credit hoga mere account mein?"},
            {"speaker": "caller", "text": "Aap Google Pay open kijiye, receive refund request show ho rahi hogi. Uss par click karke UPI PIN enter kijiye for instant credit."},
            {"speaker": "victim", "text": "Receive karne ke liye bhi UPI PIN lagta hai kya?"}
        ]
    },
    # 10. Utility Disconnect (en-IN)
    {
        "id": "holdout_ud_en_001",
        "language": "en-IN",
        "label": "utility_disconnect",
        "legit_kind": None,
        "difficulty": "hard",
        "split": "holdout",
        "turns": [
            {"speaker": "caller", "text": "Urgent alert from the State Electricity Distribution Board. Is this the meter consumer?"},
            {"speaker": "victim", "text": "Yes, what is the matter? We are in the middle of dinner."},
            {"speaker": "caller", "text": "Dear consumer, your electricity bill update failed on the central grid server. Your power line is scheduled for disconnection tonight at 9:30 PM."},
            {"speaker": "victim", "text": "That is ridiculous, I paid the electricity bill through my bank app on the fifth of this month!"},
            {"speaker": "caller", "text": "The bill receipt was rejected by the nodal billing office. To prevent disconnection, pay the overdue charge of 1,890 rupees immediately through our officer helpline link."},
            {"speaker": "victim", "text": "Please do not cut the power, there is an elderly patient on oxygen at home!"}
        ]
    },
    # 11. Utility Disconnect (hi-IN)
    {
        "id": "holdout_ud_hi_001",
        "language": "hi-IN",
        "label": "utility_disconnect",
        "legit_kind": None,
        "difficulty": "hard",
        "split": "holdout",
        "turns": [
            {"speaker": "caller", "text": "बिजली विभाग कंट्रोल रूम से जूनियर इंजीनियर बोल रहा हूँ। आपका मीटर कनेक्शन नंबर चेक कीजिए।"},
            {"speaker": "victim", "text": "हाँ साहब, क्या समस्या है? हमने तो बिल समय पर भर दिया था।"},
            {"speaker": "caller", "text": "पिछले तीन महीने का बिजली बिल सॉफ्टवेयर में अपडेट नहीं हुआ है। अगले एक घंटे में लाइनमैन आपकी बिजली काट देगा।"},
            {"speaker": "victim", "text": "साहब कल बच्चों की बोर्ड परीक्षा है, बिजली कट जाएगी तो बहुत दिक्कत होगी!"},
            {"speaker": "caller", "text": "अगर लाइन कटने से बचना है तो तुरंत हमारे द्वारा भेजे गए लिंक पर जाकर बकाया बिल का भुगतान कीजिए, वरना कनेक्शन कट जाएगा।"},
            {"speaker": "victim", "text": "साहब लिंक भेजिए, मैं तुरंत पेमेंट करने की कोशिश करता हूँ।"}
        ]
    },
    # 12. Courier Parcel (en-IN)
    {
        "id": "holdout_cp_en_001",
        "language": "en-IN",
        "label": "courier_parcel",
        "legit_kind": None,
        "difficulty": "medium",
        "split": "holdout",
        "turns": [
            {"speaker": "caller", "text": "Hello, this is the BlueDart courier parcel distribution hub customer helpline. We have an international package for you that has been flagged at customs."},
            {"speaker": "victim", "text": "A parcel? I did not order anything from abroad, who is the sender?"},
            {"speaker": "caller", "text": "The parcel originated from Cambodia under your name and Aadhaar details, containing restricted foreign currency and unauthorized surveillance chips."},
            {"speaker": "victim", "text": "I don't know anyone in Cambodia, someone is misusing my identity!"},
            {"speaker": "caller", "text": "Our hub manager has connected you directly to the narcotics control bureau. Stay on the line, an arrest summons has been prepared."},
            {"speaker": "victim", "text": "Please hold on, let me speak to the officer, I have done nothing wrong."}
        ]
    },
    # 13. Tech Support Remote (en-IN)
    {
        "id": "holdout_ts_en_001",
        "language": "en-IN",
        "label": "tech_support_remote",
        "legit_kind": None,
        "difficulty": "medium",
        "split": "holdout",
        "turns": [
            {"speaker": "caller", "text": "Good day sir, this is Microsoft Windows Security Center in Bangalore. We are receiving critical telemetry alerts from your home computer."},
            {"speaker": "victim", "text": "My laptop? What kind of alerts? It was running a bit slow this morning."},
            {"speaker": "caller", "text": "A dangerous trojan malware has compromised your banking cookies and network firewall. Your personal passwords are being leaked to a foreign server."},
            {"speaker": "victim", "text": "Oh heavens, how can I stop this immediately?"},
            {"speaker": "caller", "text": "Please sit in front of your computer screen now. Press Windows key and R, and download AnyDesk or TeamViewer so our certified network engineer can remote in and purge the malicious virus."},
            {"speaker": "victim", "text": "Okay, I am sitting at my laptop, opening the browser to install AnyDesk."}
        ]
    },
    # 14. Family Emergency (en-IN)
    {
        "id": "holdout_fe_en_001",
        "language": "en-IN",
        "label": "family_emergency",
        "legit_kind": None,
        "difficulty": "hard",
        "split": "holdout",
        "turns": [
            {"speaker": "caller", "text": "Uncle, uncle, can you hear me? This is Rohit's college friend Rahul calling, there has been a terrible emergency!"},
            {"speaker": "victim", "text": "Rahul? What happened to Rohit? Why are you calling from a strange phone number?"},
            {"speaker": "caller", "text": "Rohit met with a severe highway motorcycle crash near Pune. His smartphone got smashed in the accident and he is unconscious in the emergency ward right now."},
            {"speaker": "victim", "text": "Oh my god! Is he breathing? Where are his parents?"},
            {"speaker": "caller", "text": "The doctors need an immediate surgical advance deposit of 25,000 rupees to start emergency treatment. Please don't tell auntie yet, she has a weak heart, just transfer the money to this clinic doctor UPI ID right now."},
            {"speaker": "victim", "text": "I will send the money right away, give me the UPI ID immediately!"}
        ]
    },
    # 15. Investment Task (hi-en)
    {
        "id": "holdout_it_hien_001",
        "language": "hi-en",
        "label": "investment_task",
        "legit_kind": None,
        "difficulty": "hard",
        "split": "holdout",
        "turns": [
            {"speaker": "caller", "text": "Hello ma'am, congratulations! You have completed task level two on our Telegram work-from-home review channel."},
            {"speaker": "victim", "text": "Yes, I submitted the Google hotel reviews yesterday, where is my payout?"},
            {"speaker": "caller", "text": "Ma'am, your dashboard shows an accumulated profit of 48,000 rupees! To unlock and withdraw this guaranteed amount to your bank, you must deposit 15,000 rupees as mandatory clearance capital."},
            {"speaker": "victim", "text": "Deposit fifteen thousand rupees? But earlier you said tasks were completely free!"},
            {"speaker": "caller", "text": "This is refundable security deposit. Once you transfer fifteen thousand to our corporate account, your full 63,000 balance will be credited within five minutes."},
            {"speaker": "victim", "text": "Okay, send me the company account number so I can transfer and withdraw my profits."}
        ]
    },
    # 16. Legit Bank Advisory (hard negative, en-IN)
    {
        "id": "holdout_legit_ba_en_001",
        "language": "en-IN",
        "label": "legit",
        "legit_kind": "bank_advisory",
        "difficulty": "hard",
        "split": "holdout",
        "turns": [
            {"speaker": "caller", "text": "Good morning, this is an automated public awareness bulletin from the Reserve Bank of India."},
            {"speaker": "victim", "text": "Yes, I am listening."},
            {"speaker": "caller", "text": "Never share your one-time passwords, debit card CVV, or NetBanking credentials with anyone over phone or SMS. Remember, police and courts never place citizens under digital arrest."},
            {"speaker": "victim", "text": "Thank you, that is very helpful advice for our family."},
            {"speaker": "caller", "text": "Stay vigilant. In case of suspicious financial fraud, report immediately to cyber crime portal or helpline 1930."}
        ]
    },
    # 17. Legit Bank Advisory (hard negative, hi-IN)
    {
        "id": "holdout_legit_ba_hi_001",
        "language": "hi-IN",
        "label": "legit",
        "legit_kind": "bank_advisory",
        "difficulty": "hard",
        "split": "holdout",
        "turns": [
            {"speaker": "caller", "text": "नमस्ते, भारतीय स्टेट बैंक की ओर से ग्राहक सुरक्षा एवं वित्तीय जागरूकता संदेश।"},
            {"speaker": "victim", "text": "जी, बताइए क्या सूचना है?"},
            {"speaker": "caller", "text": "कृपया ध्यान दें, बैंक अधिकारी कभी भी फोन पर आपसे ओटीपी, पासवर्ड या यूपीआई पिन नहीं मांगते। किसी भी अनजान कॉलर के कहने पर एनीडेस्क ऐप डाउनलोड न करें।"},
            {"speaker": "victim", "text": "जी धन्यवाद, मैं हमेशा इस बात का ध्यान रखता हूँ।"},
            {"speaker": "caller", "text": "सुरक्षित रहें और साइबर धोखाधड़ी की स्थिति में तुरंत अपने बैंक को सूचित करें।"}
        ]
    },
    # 18. Legit Bank Advisory (hard negative, hi-en)
    {
        "id": "holdout_legit_ba_hien_001",
        "language": "hi-en",
        "label": "legit",
        "legit_kind": "bank_advisory",
        "difficulty": "hard",
        "split": "holdout",
        "turns": [
            {"speaker": "caller", "text": "Hello, this is an important security reminder from ICICI Bank fraud prevention unit."},
            {"speaker": "victim", "text": "Haan bol rahe hain, koi issue hai kya?"},
            {"speaker": "caller", "text": "Bank will never ask you to disclose verification codes or download remote screen-sharing tools like AnyDesk to unblock your account. Be aware of fraud calls claiming parcel arrest."},
            {"speaker": "victim", "text": "Acha hua bata diya, aajkal bahut scams chal rahe hain."},
            {"speaker": "caller", "text": "Thank you for banking with us. Report unauthorized transactions on 1930."}
        ]
    },
    # 19. Legit Delivery OTP (hard negative, en-IN)
    {
        "id": "holdout_legit_do_en_001",
        "language": "en-IN",
        "label": "legit",
        "legit_kind": "delivery_otp",
        "difficulty": "hard",
        "split": "holdout",
        "turns": [
            {"speaker": "caller", "text": "Hello sir, Zomato delivery partner here. I am standing near the main security gate of your apartment complex."},
            {"speaker": "victim", "text": "Yes, I was tracking the delivery on the map. Come up to flat 402 on the fourth floor."},
            {"speaker": "caller", "text": "Sir, guard allowed me in, I am at your door. Please share the four-digit delivery PIN so I can close the order and hand over the meal."},
            {"speaker": "victim", "text": "Sure, opening the door right now. The delivery pin is four, seven, two, nine."},
            {"speaker": "caller", "text": "PIN verified successfully sir, here is your hot food package. Enjoy your dinner!"}
        ]
    },
    # 20. Legit Delivery OTP (hard negative, hi-IN)
    {
        "id": "holdout_legit_do_hi_001",
        "language": "hi-IN",
        "label": "legit",
        "legit_kind": "delivery_otp",
        "difficulty": "hard",
        "split": "holdout",
        "turns": [
            {"speaker": "caller", "text": "नमस्ते भैया, फ्लिपकार्ट डिलीवरी बॉय बोल रहा हूँ। आपका जूतों वाला पार्सल लेकर आया हूँ।"},
            {"speaker": "victim", "text": "हाँ भैया, मैं घर पर ही हूँ, घंटी बजा दीजिए।"},
            {"speaker": "caller", "text": "दरवाजे पर खड़ा हूँ भैया, पार्सल देने के लिए आपके मोबाइल पर आया हुआ चार अंकों का डिलीवरी ओटीपी बता दीजिए।"},
            {"speaker": "victim", "text": "हाँ एक मिनट, डिलीवरी ओटीपी है आठ, तीन, एक, पाँच।"},
            {"speaker": "caller", "text": "ओटीपी मैच हो गया भैया, यह रहा आपका पार्सल, धन्यवाद।"}
        ]
    },
    # 21. Legit Delivery OTP (hard negative, hi-en)
    {
        "id": "holdout_legit_do_hien_001",
        "language": "hi-en",
        "label": "legit",
        "legit_kind": "delivery_otp",
        "difficulty": "hard",
        "split": "holdout",
        "turns": [
            {"speaker": "caller", "text": "Hello sir, Amazon delivery courier boy here. Aapke society lobby mein aa gaya hoon with the parcel."},
            {"speaker": "victim", "text": "Haan bhai, lift se third floor pe aa jao."},
            {"speaker": "caller", "text": "Door pe khada hoon sir. Delivery complete karne ke liye parcel secret code bata dijiye please."},
            {"speaker": "victim", "text": "Haan message check kiya, secret code hai six, two, nine, zero."},
            {"speaker": "caller", "text": "Okay sir, verification ho gaya. Parcel receive kar lijiye."}
        ]
    },
    # 22. Legit Family Money (hard negative, en-IN)
    {
        "id": "holdout_legit_fm_en_001",
        "language": "en-IN",
        "label": "legit",
        "legit_kind": "family_money",
        "difficulty": "hard",
        "split": "holdout",
        "turns": [
            {"speaker": "caller", "text": "Hi Dad, are you free for a second? I just reached the coaching class."},
            {"speaker": "victim", "text": "Yes beta, is everything okay? Did you reach safely?"},
            {"speaker": "caller", "text": "Yes Dad, but the auto rickshaw driver doesn't have cash change for a five hundred rupee note. Can you Google Pay him two hundred rupees?"},
            {"speaker": "victim", "text": "Sure sweetheart, tell him to show his QR code or send his number on WhatsApp."},
            {"speaker": "caller", "text": "I am sending his number right now, thanks Dad, see you in the evening."}
        ]
    },
    # 23. Legit Family Money (hard negative, hi-IN)
    {
        "id": "holdout_legit_fm_hi_001",
        "language": "hi-IN",
        "label": "legit",
        "legit_kind": "family_money",
        "difficulty": "hard",
        "split": "holdout",
        "turns": [
            {"speaker": "caller", "text": "पापा प्रणाम, मैं कॉलेज की लाइब्रेरी से बोल रहा हूँ।"},
            {"speaker": "victim", "text": "हाँ बेटा, क्लास खत्म हो गई तुम्हारी?"},
            {"speaker": "caller", "text": "हाँ पापा, प्रोजेक्ट की फाइल और नोट्स फोटोकॉपी करवाने हैं, दुकान वाले को चार सौ रुपये यूपीआई कर दीजिए मेरे नंबर पर।"},
            {"speaker": "victim", "text": "हाँ अभी कर देता हूँ फोनपे से। पढ़ाई कैसी चल रही है?"},
            {"speaker": "caller", "text": "बहुत अच्छी चल रही है पापा, पैसे आ गए, धन्यवाद!"}
        ]
    },
    # 24. Legit Family Money (hard negative, hi-en)
    {
        "id": "holdout_legit_fm_hien_001",
        "language": "hi-en",
        "label": "legit",
        "legit_kind": "family_money",
        "difficulty": "hard",
        "split": "holdout",
        "turns": [
            {"speaker": "caller", "text": "Hey bhaiya, are you home right now?"},
            {"speaker": "victim", "text": "Haan bolo, main laptop pe kaam kar raha tha. Kuch chahiye tha?"},
            {"speaker": "caller", "text": "Bhaiya grocery store pe card swipe machine down hai. Mere account mein one thousand rupees send kar do na Google Pay pe, main bill pay kar dungi."},
            {"speaker": "victim", "text": "Theek hai, abhi do minute mein regular number pe transfer kar deta hoon."},
            {"speaker": "caller", "text": "Thanks bhaiya, received notification, shaam ko milte hain."}
        ]
    },
    # 25. Legit Customer Care (en-IN)
    {
        "id": "holdout_legit_cc_en_001",
        "language": "en-IN",
        "label": "legit",
        "legit_kind": "customer_care",
        "difficulty": "easy",
        "split": "holdout",
        "turns": [
            {"speaker": "caller", "text": "Good afternoon, this is Priya from Airtel Fiber customer service following up on your broadband service request."},
            {"speaker": "victim", "text": "Yes, hello Priya. When will the technician come to set up the router?"},
            {"speaker": "caller", "text": "Our field engineer Ramesh is assigned to visit your premise tomorrow morning between ten and twelve. Will you be available?"},
            {"speaker": "victim", "text": "Yes, I work from home tomorrow, that time window is perfectly fine."},
            {"speaker": "caller", "text": "Thank you, your appointment is confirmed. Have a pleasant day!"}
        ]
    },
    # 26. Legit Customer Care (hi-IN)
    {
        "id": "holdout_legit_cc_hi_001",
        "language": "hi-IN",
        "label": "legit",
        "legit_kind": "customer_care",
        "difficulty": "easy",
        "split": "holdout",
        "turns": [
            {"speaker": "caller", "text": "नमस्कार, भारत गैस डिस्ट्रीब्यूशन एजेंसी से सुमन बात कर रही हूँ।"},
            {"speaker": "victim", "text": "नमस्ते मैडम, हमारे रसोई गैस सिलेंडर के बारे में फोन है क्या?"},
            {"speaker": "caller", "text": "हाँ जी, आपके कल के गैस सिलेंडर रिफिल की डिलीवरी सफल रही? क्या डिलीवरी ब्वॉय ने कोई अतिरिक्त शुल्क तो नहीं माँगा?"},
            {"speaker": "victim", "text": "नहीं मैडम, सब कुछ बिल्कुल सही था, सिलेंडर समय पर मिल गया था।"},
            {"speaker": "caller", "text": "फीडबैक के लिए धन्यवाद सर, आपका दिन शुभ हो।"}
        ]
    },
    # 27. Legit Appointment (en-IN)
    {
        "id": "holdout_legit_a_en_001",
        "language": "en-IN",
        "label": "legit",
        "legit_kind": "appointment",
        "difficulty": "easy",
        "split": "holdout",
        "turns": [
            {"speaker": "caller", "text": "Good morning, this is Apollo Dental Clinic calling to confirm your routine dental cleaning appointment."},
            {"speaker": "victim", "text": "Good morning, yes, I had booked for Thursday afternoon with Dr. Rao."},
            {"speaker": "caller", "text": "That is correct, Thursday at 3:30 PM. Please arrive ten minutes early for initial registration."},
            {"speaker": "victim", "text": "Sure, I have noted down the time. See you on Thursday."},
            {"speaker": "caller", "text": "Thank you, see you then."}
        ]
    },
    # 28. Legit Appointment (hi-IN)
    {
        "id": "holdout_legit_a_hi_001",
        "language": "hi-IN",
        "label": "legit",
        "legit_kind": "appointment",
        "difficulty": "easy",
        "split": "holdout",
        "turns": [
            {"speaker": "caller", "text": "नमस्ते सर, मेट्रो डायग्नोस्टिक सेंटर से रिसेप्शनिस्ट बोल रही हूँ।"},
            {"speaker": "victim", "text": "नमस्ते, कल सुबह के ब्लड टेस्ट के बारे में कॉल है?"},
            {"speaker": "caller", "text": "जी सर, याद दिलाने के लिए कॉल किया था कि कल सुबह आठ बजे सैंपल देने से पहले आपको दस घंटे का उपवास रखना है।"},
            {"speaker": "victim", "text": "हाँ बिल्कुल, मैं रात दस बजे के बाद कुछ नहीं खाऊंगा।"},
            {"speaker": "caller", "text": "धन्यवाद सर, कल सुबह आठ बजे लैब में मिलते हैं।"}
        ]
    },
    # 29. Legit Chitchat (en-IN)
    {
        "id": "holdout_legit_c_en_001",
        "language": "en-IN",
        "label": "legit",
        "legit_kind": "chitchat",
        "difficulty": "easy",
        "split": "holdout",
        "turns": [
            {"speaker": "caller", "text": "Hey Vivek, how are you man? Long time no talk!"},
            {"speaker": "victim", "text": "Hey Sameer! What a pleasant surprise, I was just thinking about you the other day."},
            {"speaker": "caller", "text": "I just got back from a trekking trip in the Western Ghats with some college friends. The monsoon waterfalls were unbelievable."},
            {"speaker": "victim", "text": "That sounds fantastic! Let's definitely catch up for coffee this Sunday afternoon."},
            {"speaker": "caller", "text": "Awesome, I'll text you the cafe location on Saturday. Take care!"}
        ]
    },
    # 30. Legit Chitchat (hi-IN)
    {
        "id": "holdout_legit_c_hi_001",
        "language": "hi-IN",
        "label": "legit",
        "legit_kind": "chitchat",
        "difficulty": "easy",
        "split": "holdout",
        "turns": [
            {"speaker": "caller", "text": "अरे वर्मा जी नमस्कार, कैसे हैं आप? बहुत दिनों बाद आवाज सुनी।"},
            {"speaker": "victim", "text": "नमस्कार शर्मा जी! बस सब कुशल मंगल है, आप बताइए, सब ठीक-ठाक?"},
            {"speaker": "caller", "text": "हाँ जी, वो इस रविवार को सोसाइटी के पार्क की सफाई और नए पौधे लगाने की मीटिंग है, आप रहेंगे ना?"},
            {"speaker": "victim", "text": "हाँ बिल्कुल रहूँगा, पर्यावरण के काम में हम सब साथ हैं। रविवार सुबह दस बजे मिलते हैं।"},
            {"speaker": "caller", "text": "बहुत बढ़िया वर्मा जी, रविवार को मिलते हैं, अपना ख्याल रखिएगा।"}
        ]
    }
]

def main() -> None:
    print(f"Creating {len(HOLDOUT_SCRIPTS)} holdout scripts...")
    for item in HOLDOUT_SCRIPTS:
        # Validate through Script schema
        script = Script(**item)
        target_path = CORPUS_SCRIPTS_DIR / f"{script.id}.yaml"
        with open(target_path, "w", encoding="utf-8") as f:
            yaml.dump(item, f, sort_keys=False, allow_unicode=True)
        print(f"  [OK] {script.id} ({script.label}, {script.language}, split={script.split})")
    print("All 30 holdout scripts successfully created and validated!")

if __name__ == "__main__":
    main()
