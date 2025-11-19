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
    /// Entries are stored by unix timestamp (seconds)
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

    #[event]
    struct DeleteDailyEntryEvent has drop, store {
        user_diary_object_address: address,
        user_address: address,
        date_in_unix_seconds: u64,
    }

    /// Diary entry enum - can be extended with more data types in the future
    enum DiaryEntry has store, drop, copy {
        MessageOnly {
            message: String
        }
    }

    const DIARY_REGISTRY_OBJECT_SEED: vector<u8> = b"my_permanent_diary_registry";
    
    /// Error code: Diary not found for the user
    const E_DIARY_NOT_FOUND: u64 = 1;
    /// Error code: Entry not found for the given timestamp
    const E_ENTRY_NOT_FOUND: u64 = 2;
    /// Error code: Content string exceeds maximum allowed length
    const E_CONTENT_TOO_LONG: u64 = 3;
    
    /// Maximum length for diary entry content (in bytes)
    const MAX_CONTENT_LENGTH: u64 = 10000;

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
    /// Uses the current timestamp, allowing multiple entries per day
    /// Users can add as many entries as they want
    /// 
    /// Args:
    ///   - content: String content of the diary entry (max length: MAX_CONTENT_LENGTH)
    entry fun add_daily_entry(
        sender: &signer,
        content: String,
    ) acquires Diary, DiariesRegistry {
        // Validate content length
        let content_length = content.length();
        if (content_length > MAX_CONTENT_LENGTH) {
            abort E_CONTENT_TOO_LONG
        };

        let sender_address = signer::address_of(sender);
        let diaries_reg_obj_addr = get_diaries_reg_obj_address();

        // Create diary if it doesn't exist
        if (!check_if_diary_exists(sender_address, diaries_reg_obj_addr)) {
            create_diary(sender);
        };

        let now_seconds = timestamp::now_seconds();
        let diaries_reg = borrow_global_mut<DiariesRegistry>(diaries_reg_obj_addr);
        let diary_addr = diaries_reg.all_diaries.borrow(&sender_address);
        let diary = borrow_global_mut<Diary>(*diary_addr);
        let diary_entry = DiaryEntry::MessageOnly { message: content };
        diary.daily_entries.add(now_seconds, diary_entry);

        event::emit(AddDailyEntryEvent {
            user_diary_object_address: *diary_addr,
            user_address: sender_address,
            date_in_unix_seconds: now_seconds,
            content,
        });
    }

    /// Deletes a daily entry from the sender's diary by unix timestamp
    /// Only deletes if the entry exists
    /// 
    /// Args:
    ///   - unix_timestamp: Unix timestamp (in seconds) of the entry to delete
    entry fun delete_daily_entry_by_unixtimestamp(sender: &signer, unix_timestamp: u64) acquires Diary, DiariesRegistry {
        let sender_address = signer::address_of(sender);
        let diaries_reg_obj_addr = get_diaries_reg_obj_address();
        
        // Check if diary exists before borrowing
        assert!(check_if_diary_exists(sender_address, diaries_reg_obj_addr), E_DIARY_NOT_FOUND);

        let diaries_reg = borrow_global_mut<DiariesRegistry>(diaries_reg_obj_addr);
        let diary_addr = diaries_reg.all_diaries.borrow(&sender_address);
        let diary = borrow_global_mut<Diary>(*diary_addr);

        // Check if entry exists before deletion
        assert!(diary.daily_entries.contains(&unix_timestamp), E_ENTRY_NOT_FOUND);

        diary.daily_entries.remove(&unix_timestamp);

        event::emit(DeleteDailyEntryEvent {
            user_diary_object_address: *diary_addr,
            user_address: sender_address,
            date_in_unix_seconds: unix_timestamp,
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

    /// Returns the address of the diaries registry object
    fun get_diaries_reg_obj_address(): address {
        object::create_object_address(&@permanent_diary_addr, DIARY_REGISTRY_OBJECT_SEED)
    }

    /// Helper function to extract message from DiaryEntry enum
    /// Uses pattern matching to extract the message from the enum variant
    fun extract_message_from_entry(entry: DiaryEntry): String {
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
        let diaries_reg = borrow_global_mut<DiariesRegistry>(diaries_reg_obj_addr);
        let sender_addr = signer::address_of(sender);
        diaries_reg.all_diaries.add(sender_addr, diary_addr);
    }

    /// Checks if a diary exists for the given user address
    /// 
    /// Args:
    ///   - sender_address: The user's address to check
    ///   - diaries_reg_obj_addr: The address of the diaries registry object
    /// Returns:
    ///   - true if the diary exists, false otherwise
    fun check_if_diary_exists(sender_address: address, diaries_reg_obj_addr: address): bool acquires DiariesRegistry {
        let diaries_reg = borrow_global<DiariesRegistry>(diaries_reg_obj_addr);
        diaries_reg.all_diaries.contains(&sender_address)
    }

    // ======================== Test-only functions ========================

    #[test_only]
    /// Public test-only function to initialize the module
    public fun init_module_for_test(sender: &signer) {
        init_module(sender);
    }

    #[test_only]
    /// Public test-only function wrapper for add_daily_entry
    /// Allows specifying a custom timestamp for testing
    public fun add_daily_entry_for_test(
        sender: &signer,
        date: u64,
        content: String,
    ) acquires Diary, DiariesRegistry {
        let sender_address = signer::address_of(sender);
        let diaries_reg_obj_addr = get_diaries_reg_obj_address();

        // Create diary if it doesn't exist
        if (!check_if_diary_exists(sender_address, diaries_reg_obj_addr)) {
            create_diary(sender);
        };

        // Get the diary and add the entry
        let diaries_reg = borrow_global_mut<DiariesRegistry>(diaries_reg_obj_addr);
        let diary_addr = diaries_reg.all_diaries.borrow(&sender_address);
        let diary = borrow_global_mut<Diary>(*diary_addr);
        
        // Remove existing entry if it exists (for test consistency)
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
