/*
    Permanent Diary Module
    Allows users to create and maintain a permanent diary with daily entries.
    Each user has their own diary object, and entries are stored by date (YYYYMMDD format).
*/

module permanent_diary_addr::permanent_diary {
    use std::string::String;
    use aptos_framework::object::{Self, ExtendRef, Object};
    use aptos_framework::smart_table::{Self, SmartTable};
    use std::signer;
    use std::option::{Self, Option};

    /// Global registry that maps user addresses to their diary objects
    struct Diaries has key {
        all_diaries: SmartTable<address, Object<Diary>>,
    }

    struct DiariesController has key {
        extend_ref: ExtendRef,
    }

    struct DiariesRegistry has key {
        publisher_address: address,
    }


    /// Individual user diary containing daily entries
    /// Date format: YYYYMMDD (e.g., 20241031 for October 31, 2024)
    struct Diary has key {
        daily_entries: SmartTable<u64, String>,
    }


    /// Controller for individual diary objects, provides extend_ref for extending the object
    struct DiaryController has key {
        extend_ref: ExtendRef,
    }

    /// Seed for creating user-specific diary named objects
    const DIARY_OBJECT_SEED: vector<u8> = b"my_permanent_diary";
    /// Seed for creating the global Diaries registry named object
    const DIARIES_OBJECT_SEED: vector<u8> = b"all_diaries";

    fun init_module(sender: &signer) {
        let publisher_addr = signer::address_of(sender);
        move_to(sender, DiariesRegistry {
            publisher_address: publisher_addr,
        });

        let diaries_constructor_ref = &object::create_named_object(sender, DIARIES_OBJECT_SEED);
        let diaries_signer = object::generate_signer(diaries_constructor_ref);
        
        move_to(&diaries_signer, Diaries {
            all_diaries: smart_table::new(),
        });

        move_to(&diaries_signer, DiariesController {
            extend_ref: object::generate_extend_ref(diaries_constructor_ref),
        });
    }

    // ======================== Write functions ========================

    /// Adds a daily entry to the sender's diary
    /// Creates the diary if it doesn't exist for the sender
    /// 
    /// Args:
    ///   - date: Date in YYYYMMDD format (e.g., 20241031)
    ///   - content: String content of the diary entry
    entry fun add_daily_entry(
        sender: &signer,
        date: u64,
        content: String,
    ) acquires Diary, Diaries, DiariesRegistry {
        let sender_address = signer::address_of(sender);
        let diary_address = object::create_object_address(&sender_address, DIARY_OBJECT_SEED);

        // Create diary if it doesn't exist
        if (!object::object_exists<Diary>(diary_address)) {
            create_diary(sender);
        };

        // Get the diary and add the entry
        let diary = borrow_global_mut<Diary>(diary_address);
        if (diary.daily_entries.contains(date)) {
            diary.daily_entries.remove(date);
        };
        diary.daily_entries.add(date, content);
    }

    // ======================== Read Functions ========================

    #[view]
    public fun get_diary_content_by_date(user_address: address, date: u64): Option<String> acquires Diary {
        let diary_address = object::create_object_address(&user_address, DIARY_OBJECT_SEED);

        // Check if the diary exists
        if (!exists<Diary>(diary_address)) {
            return option::none()
        };

        // Get the diary and return the content
        let diary = borrow_global<Diary>(diary_address);
        if (smart_table::contains(&diary.daily_entries, date)) {
            option::some(*smart_table::borrow(&diary.daily_entries, date))
        } else {
            option::none()
        }
    }

    // ======================== Helper functions ========================

    /// Creates a new diary object for the sender and registers it in the global Diaries registry
    /// Also creates the DiaryController for extending the diary object
    fun create_diary(
        sender: &signer
    ) acquires Diaries, DiariesRegistry {
        let diary_controller = &object::create_named_object(sender, DIARY_OBJECT_SEED);
        let diary_address = object::address_from_constructor_ref(diary_controller);
        let diary_signer = object::generate_signer(diary_controller);
        
        // Create the Diary resource
        move_to(&diary_signer, Diary {
            daily_entries: smart_table::new(),
        });

        // Create the DiaryController for extending the object
        move_to(&diary_signer, DiaryController {
            extend_ref: object::generate_extend_ref(diary_controller),
        });

        // Register the diary in the global registry
        let diaries_address = get_diaries_obj_address();
        // debug::print(&diaries_address);
        let diaries = borrow_global_mut<Diaries>(diaries_address);
        diaries.all_diaries.add(signer::address_of(sender), object::address_to_object(diary_address));
    }

    fun get_diaries_obj_address(): address acquires DiariesRegistry {
        let registry = borrow_global<DiariesRegistry>(@permanent_diary_addr);
        object::create_object_address(&registry.publisher_address, DIARIES_OBJECT_SEED)
    }

    // ======================== Test-only functions ========================

    #[test_only]
    /// Public test-only function to initialize the module
    public fun init_module_for_test(sender: &signer) {
        init_module(sender);
    }

    #[test_only]
    /// Public test-only function wrapper for add_daily_entry
    public fun add_daily_entry_for_test(
        sender: &signer,
        date: u64,
        content: String,
    ) acquires Diary, Diaries, DiariesRegistry {
        add_daily_entry(sender, date, content);
    }
}
