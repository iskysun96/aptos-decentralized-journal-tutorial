/*
    Permanent Diary Module
    Allows users to create and maintain a permanent diary with daily entries.
    Each user has their own diary object, and entries are stored by date (in unix seconds format).
*/

module permanent_diary_addr::permanent_diary {
    use std::string::String;
    use aptos_framework::object::{Self, ExtendRef};
    use aptos_framework::big_ordered_map::{Self, BigOrderedMap};
    use std::signer;
    use std::option::{Self, Option};
    use aptos_framework::event;
    use aptos_framework::timestamp;

    struct DiariesController has key {
        extend_ref: ExtendRef,
    }

    /// Global registry that maps user addresses to their diary objects
    struct DiariesRegistry has key {
        all_diaries: BigOrderedMap<address, address>, // user address -> diary object address
    }


    /// Individual user diary containing daily entries
    /// Date format: YYYYMMDD (e.g., 20241031 for October 31, 2024)
    struct Diary has key {
        daily_entries: BigOrderedMap<u64, DiaryEntry>,
    }


    /// Controller for individual diary objects, provides extend_ref for extending the object
    struct DiaryController has key {
        extend_ref: ExtendRef,
    }

    #[event]
    struct AddDailyEntryEvent has drop, store {
        user_diary_object_address: address,
        user_address: address,
        date_in_unix_seconds: u64,
        content: String,
    }

// you can extend more data types if you use Enum 
    enum DiaryEntry has store, drop, copy {
        MessageOnly {
            message: String
        }
    }

    const DIARY_REGISTRY_OBJECT_SEED: vector<u8> = b"my_permanent_diary_registry";
    const SECONDS_PER_DAY: u64 = 86400;


    fun init_module(sender: &signer) {
        let diaries_reg_constructor_ref = &object::create_named_object(sender, DIARY_REGISTRY_OBJECT_SEED);
        let diaries_reg_signer = object::generate_signer(diaries_reg_constructor_ref);

        move_to(&diaries_reg_signer, DiariesRegistry {
            all_diaries: big_ordered_map::new_with_config(0, 0, false),
        });

        move_to(&diaries_reg_signer, DiariesController {
            extend_ref: object::generate_extend_ref(diaries_reg_constructor_ref),
        });
    }

    // ======================== Write functions ========================

    /// Adds a daily entry to the sender's diary
    /// Creates the diary if it doesn't exist for the sender
    /// Automatically uses the current day's timestamp (normalized to midnight)
    /// Allows updates within the same day, but entries become permanent after the day ends
    /// 
    /// Args:
    ///   - content: String content of the diary entry
    entry fun add_daily_entry(
        sender: &signer,
        content: String,
    ) acquires Diary, DiariesRegistry {
        let sender_address = signer::address_of(sender);

        let diaries_reg_obj_addr = get_diaries_reg_obj_address();

        // Check if diary exists first (with a borrow that we'll drop)
        let diary_exists = {
            let diaries_reg = borrow_global<DiariesRegistry>(diaries_reg_obj_addr);
            diaries_reg.all_diaries.contains(&sender_address)
        };

        // Create diary if it doesn't exist
        if (!diary_exists) {
            create_diary(sender);
        };

        // Get current timestamp and normalize to start of day (midnight)
        // This ensures all entries on the same day use the same key, allowing updates
        // After the day is over, the normalized timestamp changes, making old entries permanent
        let now_seconds = timestamp::now_seconds();
        let date_in_unix_seconds = (now_seconds / SECONDS_PER_DAY) * SECONDS_PER_DAY;

        // Get the diary and add the entry
        let diaries_reg = borrow_global_mut<DiariesRegistry>(diaries_reg_obj_addr);
        let diary_addr = diaries_reg.all_diaries.borrow(&sender_address);
        let diary = borrow_global_mut<Diary>(*diary_addr);
        if (diary.daily_entries.contains(&date_in_unix_seconds)) {
            diary.daily_entries.remove(&date_in_unix_seconds);
        };

        let diary_entry = DiaryEntry::MessageOnly { message: content };
        diary.daily_entries.add(date_in_unix_seconds, diary_entry);

        event::emit(AddDailyEntryEvent {
            user_diary_object_address: *diary_addr,
            user_address: sender_address,
            date_in_unix_seconds,
            content,
        });
    }

    // ======================== Read Functions ========================

    #[view]
    public fun get_diary_object_address(user_address: address): Option<address> acquires DiariesRegistry {
        let diaries_reg_obj_addr = get_diaries_reg_obj_address();
        let diaries_reg = borrow_global<DiariesRegistry>(diaries_reg_obj_addr);
        let all_diaries = &diaries_reg.all_diaries;

        // Check if the user has created a diary
        if (!all_diaries.contains(&user_address)) {
            return option::none()
        };

        let diary_addr = all_diaries.borrow(&user_address);
        option::some(*diary_addr)
    }

    #[view]
    public fun get_diary_content_by_date(user_address: address, date: u64): Option<String> acquires Diary, DiariesRegistry {
        let diaries_reg_obj_addr = get_diaries_reg_obj_address();
        let diaries_reg = borrow_global<DiariesRegistry>(diaries_reg_obj_addr);
        let all_diaries = &diaries_reg.all_diaries;

        // Check if the user has created a diary
        if (!all_diaries.contains(&user_address)) {
            return option::none()
        };

        let diary_addr = all_diaries.borrow(&user_address);

        // Check if the diary object exists
        if (!object::object_exists<Diary>(*diary_addr)) {
            return option::none()
        };

        // Get the diary and return the content
        let diary = borrow_global<Diary>(*diary_addr);
        if (diary.daily_entries.contains(&date)) {
            let diary_entry = *diary.daily_entries.borrow(&date);
            // Extract message from enum variant using helper function
            let message = extract_message_from_entry(diary_entry);
            option::some(message)
        } else {
            option::none()
        }
    }

    fun get_diaries_reg_obj_address(): address {
        object::create_object_address(&@permanent_diary_addr, DIARY_REGISTRY_OBJECT_SEED)
    }

    /// Helper function to extract message from DiaryEntry enum
    fun extract_message_from_entry(entry: DiaryEntry): String {
        // Since DiaryEntry only has MessageOnly variant currently, we can directly extract
        // In the future, if more variants are added, this would need pattern matching
        let DiaryEntry::MessageOnly { message } = entry;
        message
    }

    // ======================== Helper functions ========================

    /// Creates a new diary object for the sender and registers it in the global Diaries registry
    /// Also creates the DiaryController for extending the diary object
    fun create_diary(sender: &signer) acquires DiariesRegistry {
        let diary_constructor_ref = &object::create_object(signer::address_of(sender));

        let diary_signer = object::generate_signer(diary_constructor_ref);
        let diary_addr = signer::address_of(&diary_signer);
        
        // Create the Diary resource
        move_to(&diary_signer, Diary {
            daily_entries: big_ordered_map::new_with_config(0, 0, false),
        });

        // Create the DiaryController for extending the object
        move_to(&diary_signer, DiaryController {
            extend_ref: object::generate_extend_ref(diary_constructor_ref),
        });

        // Register the diary in the global registry
        let diaries_reg_obj_addr = get_diaries_reg_obj_address();
        // debug::print(&diaries_address);
        let diaries_reg = borrow_global_mut<DiariesRegistry>(diaries_reg_obj_addr);
        let sender_addr = signer::address_of(sender);
        diaries_reg.all_diaries.add(sender_addr, diary_addr);
    }


    // ======================== Test-only functions ========================

    #[test_only]
    /// Public test-only function to initialize the module
    public fun init_module_for_test(sender: &signer) {
        init_module(sender);
    }

    #[test_only]
    /// Public test-only function wrapper for add_daily_entry
    /// Bypasses timestamp check for testing
    public fun add_daily_entry_for_test(
        sender: &signer,
        date: u64,
        content: String,
    ) acquires Diary, DiariesRegistry {
        let sender_address = signer::address_of(sender);
        let diaries_reg_obj_addr = get_diaries_reg_obj_address();

        // Check if diary exists first (with a borrow that we'll drop)
        let diary_exists = {
            let diaries_reg = borrow_global<DiariesRegistry>(diaries_reg_obj_addr);
            diaries_reg.all_diaries.contains(&sender_address)
        };

        // Create diary if it doesn't exist
        if (!diary_exists) {
            create_diary(sender);
        };

        // Get the diary and add the entry
        let diaries_reg = borrow_global_mut<DiariesRegistry>(diaries_reg_obj_addr);
        let diary_addr = diaries_reg.all_diaries.borrow(&sender_address);
        let diary = borrow_global_mut<Diary>(*diary_addr);
        if (diary.daily_entries.contains(&date)) {
            diary.daily_entries.remove(&date);
        };

        let diary_entry = DiaryEntry::MessageOnly { message: content };
        diary.daily_entries.add(date, diary_entry);

        event::emit(AddDailyEntryEvent {
            user_diary_object_address: *diary_addr,
            user_address: sender_address,
            date_in_unix_seconds: date,
            content,
        });
    }
}
