import pytest
from app.engine.analyzer import analyze_text, analyze_segments
from app.models.analysis import Segment, Signal
from app.engine.matcher import Matcher


# Table-driven test cases: (name, text, lang, expected_min_level, expected_max_level, expected_type)
TEST_CASES = [
    # --- 1. DIGITAL ARREST POSITIVES (Hindi, Hinglish, English) ---
    (
        "digital_arrest_hi_1",
        "यह सीबीआई और पुलिस हेडक्वार्टर से कॉल है। आप पर मनी लॉन्ड्रिंग का केस दर्ज है और अरेस्ट वारंट निकला है। फोन मत काटना, वीडियो कॉल पर रहिए।",
        "hi-IN",
        "likely_scam",
        "scam",
        "digital_arrest",
    ),
    (
        "digital_arrest_hi_2",
        "मैं सुप्रीम कोर्ट और क्राइम ब्रांच का अफसर बोल रहा हूँ। आपका आधार गैर कानूनी पार्सल में मिला है। डिजिटल अरेस्ट के तहत लाइन पर रहिए और सेफ अकाउंट में पैसे भेजिए।",
        "hi-IN",
        "scam",
        "scam",
        "digital_arrest",
    ),
    (
        "digital_arrest_hinglish_1",
        "Hello main Delhi police aur cyber cell se DSP bol raha hu. Aapka naam narcotics case registered me aaya hai. Arrest warrant ready hai, call mat kaatna Skype video call par aao.",
        "hi-IN",
        "likely_scam",
        "scam",
        "digital_arrest",
    ),
    (
        "digital_arrest_hinglish_2",
        "CBI officer here. Mumbai customs me aapka courier parcel pakda gaya hai jisme illegal drugs hai. Stay on the call under digital arrest kisi ko mat batana.",
        "hi-IN",
        "likely_scam",
        "scam",
        "digital_arrest",
    ),
    (
        "digital_arrest_en_1",
        "This is officer Vikram from Crime Branch cyber cell. We have issued an arrest warrant against you for money laundering. You are under digital arrest. Stay on the call and keep this confidential.",
        "en-IN",
        "likely_scam",
        "scam",
        "digital_arrest",
    ),
    (
        "digital_arrest_en_2",
        "Customs department officer calling. An illegal parcel with contraband was found with your passport. Police FIR registered. Do not disconnect the video call, room lock karke baat kijiye.",
        "en-IN",
        "likely_scam",
        "scam",
        "digital_arrest",
    ),

    # --- 2. BANK KYC POSITIVES ---
    (
        "bank_kyc_hi_1",
        "आपका बैंक खाता बंद हो जाएगा क्योंकि केवाईसी समाप्त हो गई है। तुरंत अपडेट करने के लिए अपना यूपीआई पिन बताइए।",
        "hi-IN",
        "likely_scam",
        "scam",
        "bank_kyc",
    ),
    (
        "bank_kyc_hi_2",
        "एसबीआई से बोल रहा हूँ, आपका अकाउंट ब्लॉक होने वाला है। तुरंत एनीडेस्क ऐप इंस्टॉल करके स्क्रीन शेयर कीजिए।",
        "hi-IN",
        "likely_scam",
        "scam",
        "bank_kyc",
    ),
    (
        "bank_kyc_hinglish_1",
        "Dear customer, aapka bank account block ho jayega. Urgent KYC update ke liye phone par aaya OTP batao.",
        "hi-IN",
        "likely_scam",
        "scam",
        "bank_kyc",
    ),
    (
        "bank_kyc_hinglish_2",
        "Sir aapka account suspend kar diya gaya hai KYC pending hai. QuickSupport app download kijiye aur code share kijiye.",
        "hi-IN",
        "likely_scam",
        "scam",
        "bank_kyc",
    ),
    (
        "bank_kyc_en_1",
        "This is bank customer support. Your account block is scheduled tonight because KYC update is pending. Please share your OTP now.",
        "en-IN",
        "likely_scam",
        "scam",
        "bank_kyc",
    ),
    (
        "bank_kyc_en_2",
        "Important notice: Your bank account suspend warning. Install AnyDesk to complete Aadhaar link verification immediately.",
        "en-IN",
        "likely_scam",
        "scam",
        "bank_kyc",
    ),

    # --- 3. UPI REFUND POSITIVES ---
    (
        "upi_refund_hi_1",
        "बधाई हो, आपको 25000 का रिफंड मिला है। रिफंड पाने के लिए क्यूआर कोड स्कैन करके अपना यूपीआई पिन डालिए।",
        "hi-IN",
        "likely_scam",
        "scam",
        "upi_refund",
    ),
    (
        "upi_refund_hi_2",
        "सर गलती से आपके खाते में पैसे आ गए हैं। हमारे सेफ अकाउंट में पैसे भेजिए या कैशबैक क्लेम करने के लिए ओटीपी दीजिए।",
        "hi-IN",
        "likely_scam",
        "scam",
        "upi_refund",
    ),
    (
        "upi_refund_hinglish_1",
        "Sir PhonePe cashback refund mila hai aapko Rs 5000. Collect karne ke liye QR scan karke UPI PIN enter kijiye.",
        "hi-IN",
        "likely_scam",
        "scam",
        "upi_refund",
    ),
    (
        "upi_refund_hinglish_2",
        "Aapka pending refund claim karne ke liye TeamViewer install karke OTP share karo.",
        "hi-IN",
        "likely_scam",
        "scam",
        "upi_refund",
    ),
    (
        "upi_refund_en_1",
        "You have won an instant cashback refund. Scan this QR code and enter your UPI PIN to receive the money in your account.",
        "en-IN",
        "likely_scam",
        "scam",
        "upi_refund",
    ),
    (
        "upi_refund_en_2",
        "Wrong payment sent to your account mistakenly. Please transfer money back to verification amount account immediately.",
        "en-IN",
        "likely_scam",
        "scam",
        "upi_refund",
    ),

    # --- 4. UTILITY DISCONNECT POSITIVES ---
    (
        "utility_hi_1",
        "बिजली विभाग की अंतिम चेतावनी: आज रात बिजली काट दी जाएगी क्योंकि बिल बकाया है। तुरंत जुर्माना और प्रोसेसिंग फीस भेजिए।",
        "hi-IN",
        "likely_scam",
        "scam",
        "utility_disconnect",
    ),
    (
        "utility_hinglish_1",
        "Electricity disconnect notice: Tonight at 9 power supply cut ho jayegi. Turant within 10 minutes AnyDesk download karke bill update karo.",
        "hi-IN",
        "likely_scam",
        "scam",
        "utility_disconnect",
    ),
    (
        "utility_en_1",
        "Dear consumer, your electricity disconnect is scheduled tonight at 9 PM. Transfer bill amount immediately to avoid disconnection.",
        "en-IN",
        "likely_scam",
        "scam",
        "utility_disconnect",
    ),

    # --- 5. COURIER / PARCEL POSITIVES ---
    (
        "courier_hi_1",
        "कस्टम और पुलिस विभाग: आपका फेडेक्स कूरियर पार्सल रोक लिया गया है जिसमें ड्रग्स पाए गए हैं। केस दर्ज होने से पहले पेनल्टी ट्रांसफर भेजिए।",
        "hi-IN",
        "likely_scam",
        "scam",
        "courier_parcel",
    ),
    (
        "courier_hinglish_1",
        "FedEx courier parcel customs clearance issue. Crime branch narcotics police ne case registered kiya hai, arrest se bachne ke liye fine transfer karo.",
        "hi-IN",
        "likely_scam",
        "scam",
        "courier_parcel",
    ),
    (
        "courier_en_1",
        "Customs department and police warning. Your FedEx parcel containing contraband has been seized. An arrest warrant is issued unless you pay the penalty fee.",
        "en-IN",
        "likely_scam",
        "scam",
        "courier_parcel",
    ),

    # --- 6. TECH SUPPORT REMOTE ACCESS POSITIVES ---
    (
        "tech_support_hi_1",
        "माइक्रोसॉफ्ट टेक्निकल सपोर्ट से बोल रहा हूँ। आपके कंप्यूटर में वायरस है, तुरंत टीमव्यूअर ऐप इंस्टॉल कीजिए और स्क्रीन शेयर कीजिए।",
        "hi-IN",
        "likely_scam",
        "scam",
        "tech_support_remote",
    ),
    (
        "tech_support_hinglish_1",
        "Security warning: Your system is hacked. Download AnyDesk apk immediately within 10 minutes to fix virus.",
        "hi-IN",
        "likely_scam",
        "scam",
        "tech_support_remote",
    ),
    (
        "tech_support_en_1",
        "Windows tech support calling. Urgent action required right now. Install QuickSupport app to clean the security breach.",
        "en-IN",
        "likely_scam",
        "scam",
        "tech_support_remote",
    ),

    # --- 7. FAMILY EMERGENCY POSITIVES ---
    (
        "family_emergency_hi_1",
        "पापा मेरा एक्सीडेंट हो गया है और मैं पुलिस स्टेशन में हूँ। बहुत बड़ी मुसीबत है, तुरंत ज़मानत के लिए पैसे भेजिए।",
        "hi-IN",
        "likely_scam",
        "scam",
        "family_emergency",
    ),
    (
        "family_emergency_hinglish_1",
        "Mummy main police station me hu mera serious accident ho gaya. Kisi ko mat batana emergency operation ke liye paise bhej do turant.",
        "hi-IN",
        "likely_scam",
        "scam",
        "family_emergency",
    ),
    (
        "family_emergency_en_1",
        "Dad I am calling from a new number, I am in hospital after an accident. Please transfer money for surgery right now, don't tell anyone yet.",
        "en-IN",
        "likely_scam",
        "scam",
        "family_emergency",
    ),

    # --- 8. LOTTERY / PRIZE POSITIVES ---
    (
        "lottery_hi_1",
        "बधाई हो, आपने केबीसी में 25 लाख की लॉटरी जीती है। इनाम पाने के लिए प्रोसेसिंग फीस के रूप में पैसे भेजिए।",
        "hi-IN",
        "likely_scam",
        "scam",
        "lottery_prize",
    ),
    (
        "lottery_hinglish_1",
        "KBC lottery department: You have won 25 lakh prize money. Processing fee aur tax transfer kijiye to claim the prize.",
        "hi-IN",
        "likely_scam",
        "scam",
        "lottery_prize",
    ),
    (
        "lottery_en_1",
        "Congratulations! You won a cash lottery prize of 25 lakh. Transfer the verification amount deposit to claim your prize.",
        "en-IN",
        "likely_scam",
        "scam",
        "lottery_prize",
    ),

    # --- 9. INVESTMENT / TASK POSITIVES ---
    (
        "investment_hi_1",
        "घर बैठे पार्ट टाइम जॉब: टेलीग्राम पर वीडियो लाइक करने का काम करें। गारंटीड रिटर्न और पैसे डबल पाने के लिए ट्रेडिंग में पैसे भेजिए।",
        "hi-IN",
        "likely_scam",
        "scam",
        "investment_task",
    ),
    (
        "investment_hinglish_1",
        "Part time job offer: Telegram task like and subscribe karke daily profit kamaye. Double your money guaranteed returns ke liye transfer kijiye.",
        "hi-IN",
        "likely_scam",
        "scam",
        "investment_task",
    ),
    (
        "investment_en_1",
        "Work from home investment opportunity. Join our Telegram task trading group for guaranteed returns and daily profit. Send money to start.",
        "en-IN",
        "likely_scam",
        "scam",
        "investment_task",
    ),

    # --- 10. NEGATION / WARNING SUPPRESSION (Must NOT be scam!) ---
    (
        "negation_bank_en",
        "Dear customer, State Bank of India reminds you to never share your OTP or CVV with anyone over phone or email.",
        "en-IN",
        "safe",
        "safe",
        "none",
    ),
    (
        "negation_bank_hi",
        "कृपया ध्यान दें: बैंक कभी भी आपसे फोन पर आपका ओटीपी या यूपीआई पिन नहीं मांगता। किसी को भी पिन मत बताइए।",
        "hi-IN",
        "safe",
        "safe",
        "none",
    ),
    (
        "negation_bank_hinglish",
        "Bank alert: Kisi ke sath bhi apna OTP, CVV ya UPI PIN share mat karna. Fraud calls se savdhan rahein.",
        "hi-IN",
        "safe",
        "safe",
        "none",
    ),
    (
        "negation_police_advisory_en",
        "Public advisory: Police and CBI do not arrest anyone over video call. Do not fall for fake digital arrest calls.",
        "en-IN",
        "safe",
        "suspicious",
        "none",
    ),
    (
        "negation_sms_security",
        "Do not disclose your card number or 4 digit code to any caller claiming to be from customer service.",
        "en-IN",
        "safe",
        "safe",
        "none",
    ),
    (
        "negation_secrecy_hi",
        "अगर कोई कहे कि किसी को मत बताना, तो तुरंत अपने परिवार को बताएं। गुप्त जांच के झांसे में न आएं।",
        "hi-IN",
        "safe",
        "suspicious",
        "none",
    ),

    # --- 11. DELIVERY OTP CONTEXT (Must stay <= suspicious) ---
    (
        "delivery_zomato_hi",
        "भैया जोमैटो डिलीवरी बॉय बोल रहा हूँ, आपके गेट पर हूँ। खाना देने के लिए ओटीपी बताइए।",
        "hi-IN",
        "safe",
        "suspicious",
        "none",
    ),
    (
        "delivery_amazon_en",
        "Hello sir, Amazon delivery partner here. I am outside your house with your package. Please share the delivery OTP.",
        "en-IN",
        "safe",
        "suspicious",
        "none",
    ),
    (
        "delivery_swiggy_hinglish",
        "Bhaiya Swiggy order leke gate par khada hu. Delivery confirm karne ke liye OTP bata do.",
        "hi-IN",
        "safe",
        "suspicious",
        "none",
    ),
    (
        "delivery_blinkit",
        "Blinkit 10 minute delivery arrived at your gate. Please share order delivery OTP.",
        "en-IN",
        "safe",
        "suspicious",
        "none",
    ),
    (
        "delivery_flipkart_hi",
        "फ्लिपकार्ट पार्सल डिलीवरी के लिए ओटीपी दीजिए।",
        "hi-IN",
        "safe",
        "suspicious",
        "none",
    ),

    # --- 12. GENUINE FAMILY / CASUAL CALLS (Must stay <= suspicious) ---
    (
        "family_recharge_hi",
        "बेटा मैं मम्मी बोल रही हूँ। फोन का रिचार्ज खत्म हो गया है, 500 रुपये भेज दो।",
        "hi-IN",
        "safe",
        "suspicious",
        "none",
    ),
    (
        "family_college_fees_hinglish",
        "Papa kal subah college ki fees transfer karni hai 10000 rupey. Please bhej dena.",
        "hi-IN",
        "safe",
        "suspicious",
        "none",
    ),
    (
        "family_grocery_en",
        "Hey mom, I am at the supermarket right now. Can you transfer 2000 rupees for groceries?",
        "en-IN",
        "safe",
        "suspicious",
        "none",
    ),
    (
        "family_chat_hindi",
        "हाँ भाई, कल शाम को घर आ रहे हैं क्या? सब लोग मिलेंगे और डिनर साथ में करेंगे।",
        "hi-IN",
        "safe",
        "safe",
        "none",
    ),

    # --- 13. GENUINE BUSINESS / CUSTOMER SERVICE ---
    (
        "genuine_doctor_appointment",
        "Good morning, this is Apollo clinic calling to confirm your dental checkup appointment tomorrow at 10 AM.",
        "en-IN",
        "safe",
        "safe",
        "none",
    ),
    (
        "genuine_flight_booking",
        "Indigo airlines flight update: Your flight 6E-204 from Delhi to Bengaluru is on time from Terminal 3.",
        "en-IN",
        "safe",
        "safe",
        "none",
    ),
    (
        "genuine_interview_call",
        "Hello Pratik, we reviewed your resume for the Software Engineer position and would like to schedule an interview.",
        "en-IN",
        "safe",
        "safe",
        "none",
    ),
    (
        "genuine_plumber_hi",
        "नमस्ते सर, मैं प्लंबर बोल रहा हूँ। कल सुबह आपके घर नल ठीक करने आऊँगा।",
        "hi-IN",
        "safe",
        "safe",
        "none",
    ),
    (
        "genuine_school_notice",
        "Dear parents, school will remain closed on Monday on account of holiday. Regular classes resume Tuesday.",
        "en-IN",
        "safe",
        "safe",
        "none",
    ),

    # --- 14. BOUNDARY & EDGE CASES ---
    (
        "edge_empty",
        "",
        "hi-IN",
        "safe",
        "safe",
        "none",
    ),
    (
        "edge_whitespace",
        "   \n\t   \n  ",
        "hi-IN",
        "safe",
        "safe",
        "none",
    ),
    (
        "edge_symbols_numbers",
        "12345 67890 !@#$%^&*()_+ ~`[]{}|:;<>?,./",
        "en-IN",
        "safe",
        "safe",
        "none",
    ),
    (
        "edge_benign_long_article",
        "Cricket match highlights: The Indian team won the cricket world cup match with remarkable batting performance in Mumbai stadium. Weather forecast predicts sunny skies across north India for the remainder of the week.",
        "en-IN",
        "safe",
        "safe",
        "none",
    ),
    (
        "edge_long_text_with_scam",
        "Yesterday was a nice sunny day. We went to the market and bought vegetables. But suddenly an officer called claiming to be from Mumbai police cyber cell stating an arrest warrant has been issued against me and I am placed under digital arrest.",
        "en-IN",
        "likely_scam",
        "scam",
        "digital_arrest",
    ),

    # --- 15. ADDITIONAL SPECIFIC SCAM PATTERNS TO REACH 60+ ---
    (
        "add_police_fir_bribe",
        "Police inspector talking from cyber cell. FIR has been lodged against your son. Send money to bail him out right now.",
        "en-IN",
        "likely_scam",
        "scam",
        "family_emergency",
    ),
    (
        "add_sim_block_trai",
        "TRAI authority notification: Your Aadhaar has been misused for 500 illegal SIM cards. Police warrant issued. Call mat kaatna.",
        "hi-IN",
        "likely_scam",
        "scam",
        "digital_arrest",
    ),
    (
        "add_customs_mdma",
        "Customs department officer calling. MDMA contraband found in your parcel from Taiwan. Police case registered, pay refundable deposit.",
        "en-IN",
        "likely_scam",
        "scam",
        "courier_parcel",
    ),
    (
        "add_kbc_whatsapp",
        "KBC department head calling: Aapko 25 lakh lottery lagi hai. Processing fee deposit transfer karke prize claim karein.",
        "hi-IN",
        "likely_scam",
        "scam",
        "lottery_prize",
    ),
    (
        "add_electricity_tonight",
        "Electricity officer: Your power connection will be cut tonight at 9 PM due to unpaid bill. Immediately pay processing fee.",
        "en-IN",
        "likely_scam",
        "scam",
        "utility_disconnect",
    ),
    (
        "add_telegram_crypto",
        "Work from home daily profit: Like videos on YouTube and double your money. Join our VIP Telegram task trading group, send money.",
        "en-IN",
        "likely_scam",
        "scam",
        "investment_task",
    ),
    (
        "add_remote_bank_kyc",
        "Bank KYC expired: Download RustDesk screen share APK now and share code with officer to unblock your account.",
        "en-IN",
        "likely_scam",
        "scam",
        "bank_kyc",
    ),
    (
        "add_digital_arrest_camera",
        "CBI digital arrest: You must turn camera on and stay on the line until court order verification. Kisi ko mat batana.",
        "en-IN",
        "likely_scam",
        "scam",
        "digital_arrest",
    ),
    (
        "add_wrong_transfer_qr",
        "Sir maine galti se aapke account me 50000 bhej diye. Ye QR code scan karke UPI PIN enter karke paise wapas bhejiye.",
        "hi-IN",
        "likely_scam",
        "scam",
        "upi_refund",
    ),
    (
        "scam_secrecy_do_not_share",
        "This is CBI officer. An arrest warrant is active against you. Do not share this with anyone and stay on the call.",
        "en-IN",
        "likely_scam",
        "scam",
        "digital_arrest",
    ),
    (
        "scam_secrecy_dont_tell_family",
        "This is narcotics customs department. Non bailable arrest warrant issued against your Aadhaar. Don't tell your family about this investigation.",
        "en-IN",
        "likely_scam",
        "scam",
        "digital_arrest",
    ),
    (
        "scam_secrecy_do_not_discuss",
        "High court bench has issued digital arrest order. Do not discuss this with anyone until legal verification is complete.",
        "en-IN",
        "likely_scam",
        "scam",
        "digital_arrest",
    ),
    (
        "scam_secrecy_hi_share_mat_karna",
        "यह पुलिस साइबर सेल से कॉल है। आप पर गैर जमानती अरेस्ट वारंट है। किसी के साथ शेयर मत करना और कमरे में रहिए।",
        "hi-IN",
        "likely_scam",
        "scam",
        "digital_arrest",
    ),
    (
        "scam_secrecy_hi_charcha_mat_karna",
        "सीबीआई अफसर बोल रहा हूँ। आप पर मनी लॉन्ड्रिंग का केस दर्ज है और अरेस्ट वारंट निकला है। किसी से चर्चा मत करना।",
        "hi-IN",
        "likely_scam",
        "scam",
        "digital_arrest",
    ),
    (
        "scam_secrecy_hi_parivar",
        "कस्टम्स अफसर बात कर रहा हूँ। परिवार को मत बताना, यह गोपनीय जांच है और डिजिटल अरेस्ट ऑर्डर है।",
        "hi-IN",
        "likely_scam",
        "scam",
        "digital_arrest",
    ),
]


def test_suite_case_count():
    """Verify that we have at least 60 table-driven test cases."""
    assert len(TEST_CASES) >= 60, f"Expected >= 60 cases, got {len(TEST_CASES)}"


@pytest.mark.parametrize("name,text,lang,expected_min_level,expected_max_level,expected_type", TEST_CASES)
def test_detection_engine_cases(name, text, lang, expected_min_level, expected_max_level, expected_type):
    level_order = {"safe": 0, "suspicious": 1, "likely_scam": 2, "scam": 3}
    
    result = analyze_text(text, language_code=lang)
    
    actual_level_val = level_order[result.level]
    min_level_val = level_order[expected_min_level]
    max_level_val = level_order[expected_max_level]
    
    assert min_level_val <= actual_level_val <= max_level_val, (
        f"[{name}] Level mismatch: got '{result.level}' (score: {result.score}), "
        f"expected between '{expected_min_level}' and '{expected_max_level}'. "
        f"Signals: {[(s.category, s.evidence, s.weight) for s in result.signals]}"
    )
    
    if expected_type != "none":
        assert result.primary_type == expected_type, (
            f"[{name}] Type mismatch: got '{result.primary_type}', expected '{expected_type}'. "
            f"Types: {result.types}"
        )


def test_evidence_substring_invariant_across_all_cases():
    """Hard rule: every signals[].evidence must be an exact substring of the transcript."""
    for name, text, lang, _, _, _ in TEST_CASES:
        if not text:
            continue
        result = analyze_text(text, language_code=lang)
        for sig in result.signals:
            assert sig.evidence in text, (
                f"[{name}] Invariant violated: evidence '{sig.evidence}' not in text '{text}'"
            )
            # Verify slice offset validity
            extracted = text[sig.start_char : sig.end_char]
            assert extracted == sig.evidence, (
                f"[{name}] Slice offset mismatch: text[{sig.start_char}:{sig.end_char}]='{extracted}' vs evidence='{sig.evidence}'"
            )


def test_multi_segment_analysis():
    """Verify analyze_segments across multi-turn transcript reassembly."""
    segments = [
        Segment(index=0, text="Hello this is CBI officer Vikram from Crime Branch.", offset_s=0.0, duration_s=15.0),
        Segment(index=1, text="An arrest warrant has been issued in money laundering case.", offset_s=15.0, duration_s=15.0),
        Segment(index=2, text="You are under digital arrest, stay on the call and keep this confidential.", offset_s=30.0, duration_s=15.0),
    ]
    result = analyze_segments(segments, language_code="en-IN", total_duration=45.0)
    assert result.level in ("likely_scam", "scam")
    assert result.primary_type == "digital_arrest"
    assert len(result.signals) >= 3
    # Check that segment indices are preserved
    seg_indices = {s.segment_index for s in result.signals}
    assert 0 in seg_indices
    assert 1 in seg_indices
    assert 2 in seg_indices


def test_unreviewed_pattern_cap():
    """Section 5.3: unreviewed patterns alone never push the level above suspicious."""
    # Construct a synthetic unreviewed signal
    unreviewed_signals = [
        Signal(id="sig_test_1", category="THREAT_ARREST", weight=3, evidence="fake arrest", segment_index=0, reviewed=False),
        Signal(id="sig_test_2", category="ISOLATION", weight=3, evidence="fake isolation", segment_index=0, reviewed=False),
        Signal(id="sig_test_3", category="AUTHORITY_CLAIM", weight=2, evidence="fake cbi", segment_index=0, reviewed=False),
    ]
    matcher = Matcher()
    from app.engine.scorer import score_signals
    score, level, ptype, types, advice = score_signals(
        unreviewed_signals, matcher.types_config, matcher.categories_config
    )
    # Total score is 8 (>=7 normally likely_scam), but since all are unreviewed, must cap at suspicious
    assert level == "suspicious"


def test_advisory_sentences_suppressed():
    """M3.1b: Advisory sentences ('never share your OTP with anyone') must not trigger SECRECY or OTP_PIN_REQUEST demands."""
    test_advisories = [
        ("Bank advisory: Never share your OTP with anyone.", "en-IN"),
        ("Never share your OTP with anyone.", "en-IN"),
        ("Security notice: Do not share your OTP or PIN with anyone.", "en-IN"),
        ("State Bank advisory: Never share your confidential codes with anyone.", "en-IN"),
        ("Reserve Bank of India awareness: Never share your passwords, OTP, CVV with anyone.", "en-IN"),
        ("सतर्कता संदेश: अपना ओटीपी या पासवर्ड किसी के साथ शेयर मत करना।", "hi-IN"),
        ("बैंक परामर्श: अपना गोपनीय पिन या ओटीपी किसी से शेयर मत करना।", "hi-IN"),
        ("पुलिस एडवाइजरी: साइबर फ्रॉड से बचें और 1930 पर तुरंत रिपोर्ट करें।", "hi-IN"),
    ]
    for adv_text, lang in test_advisories:
        res = analyze_text(adv_text, language_code=lang)
        assert res.level == "safe", (
            f"Advisory '{adv_text}' scored level '{res.level}' (score {res.score}). "
            f"Signals: {[(s.category, s.evidence) for s in res.signals]}"
        )
        fired_cats = {s.category for s in res.signals}
        assert "SECRECY" not in fired_cats, f"SECRECY fired on advisory: '{adv_text}'"
        assert "OTP_PIN_REQUEST" not in fired_cats, f"OTP_PIN_REQUEST fired on advisory: '{adv_text}'"


def test_generic_authority_advisory_rule():
    """M3.1b: Authority inside a sentence with an advisory frame must not score AUTHORITY_CLAIM, THREAT_ARREST, or MONEY_TRANSFER."""
    test_cases = [
        "Public awareness bulletin: Police and CBI never place people under digital arrest or demand money transfer.",
        "Cyber cell advisory: Beware of fake police officers threatening arrest over Skype video calls.",
        "State bank awareness message: Bank officials never call asking for passwords or money transfer.",
        "पुलिस साइबर सेल एडवाइजरी: पुलिस या सी बी आई कभी भी वीडियो कॉल पर डिजिटल अरेस्ट नहीं करती और न ही पैसे ट्रांसफर करने को कहती है।",
        "आरबीआई जागरूकता संदेश: नकली सीबीआई अफसर बनकर धमकाने वाली कॉल की शिकायत तुरंत 1930 पर दर्ज करवाएं।",
    ]
    for text in test_cases:
        res = analyze_text(text)
        fired_cats = {s.category for s in res.signals}
        assert "AUTHORITY_CLAIM" not in fired_cats, f"AUTHORITY_CLAIM fired for: '{text}'"
        assert "THREAT_ARREST" not in fired_cats, f"THREAT_ARREST fired for: '{text}'"
        assert "MONEY_TRANSFER" not in fired_cats, f"MONEY_TRANSFER fired for: '{text}'"
        assert res.level == "safe"

