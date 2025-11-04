/*
    Permanent Diary Module
    Allows users to create and maintain a permanent diary with daily entries.
    Each user has their own diary object, and entries are stored by date (YYYYMMDD format).
*/

module permanent_diary_addr::permanent_diary {
    use std::string::String;
    use aptos_framework::object::{Self, ExtendRef, Object};
    use aptos_framework::big_ordered_map::{Self, BigOrderedMap};
    use std::signer;
    use std::option::{Self, Option};

    /// Global registry that maps user addresses to their diary objects
    struct Diaries has key {
        all_diaries: BigOrderedMap<address, Object<Diary>>,
    }

    /// Controller for the Diaries object, provides extend_ref for extending the object
    struct DiariesController has key {
        extend_ref: ExtendRef,
    }

    #[resource_group_member(group = aptos_framework::object::ObjectGroup)]
    /// Individual user diary containing daily entries
    /// Date format: YYYYMMDD (e.g., 20241031 for October 31, 2024)
    struct Diary has key {
        daily_entries: BigOrderedMap<u64, String>,
    }

    #[resource_group_member(group = aptos_framework::object::ObjectGroup)]
    /// Controller for individual diary objects, provides extend_ref for extending the object
    struct DiaryController has key {
        extend_ref: ExtendRef,
    }

    /// Seed for creating user-specific diary named objects
    const DIARY_OBJECT_SEED: vector<u8> = b"my_permanent_diary";
    /// Seed for creating the global Diaries registry named object
    const DIARIES_OBJECT_SEED: vector<u8> = b"all_diaries";

    /// Initializes the global Diaries registry and its controller
    /// This should be called once when the module is published
    fun init_module(_sender: &signer) {
        let diaries_constructor_ref = &object::create_named_object(_sender, DIARIES_OBJECT_SEED);
        let diaries_signer = object::generate_signer(diaries_constructor_ref);
        
        move_to(&diaries_signer, Diaries {
            all_diaries: big_ordered_map::new(),
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
    ) acquires Diary, Diaries {
        let sender_address = signer::address_of(sender);
        let diary_address = object::create_object_address(&sender_address, DIARY_OBJECT_SEED);

        // Create diary if it doesn't exist
        if (!object::object_exists<Diary>(diary_address)) {
            create_diary(sender);
        };

        // Get the diary and add the entry
        let diary = borrow_global_mut<Diary>(diary_address);
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
        let diary = &Diary[diary_address];
        diary.daily_entries.get(&date)
    }

    // ======================== Helper functions ========================

    /// Creates a new diary object for the sender and registers it in the global Diaries registry
    /// Also creates the DiaryController for extending the diary object
    fun create_diary(
        sender: &signer
    ) acquires Diaries {
        let diary_controller = &object::create_named_object(sender, DIARY_OBJECT_SEED);
        let diary_address = object::address_from_constructor_ref(diary_controller);
        let diary_signer = object::generate_signer(diary_controller);
        
        // Create the Diary resource
        move_to(&diary_signer, Diary {
            daily_entries: big_ordered_map::new(),
        });

        // Create the DiaryController for extending the object
        move_to(&diary_signer, DiaryController {
            extend_ref: object::generate_extend_ref(diary_controller),
        });

        // Register the diary in the global registry
        let diaries_address = get_diaries_obj_address();
        let diaries = borrow_global_mut<Diaries>(diaries_address);
        diaries.all_diaries.add(signer::address_of(sender), object::address_to_object(diary_address));
    }

    /// Returns the address of the global Diaries object
    fun get_diaries_obj_address(): address {
        object::create_object_address(&@permanent_diary_addr, DIARIES_OBJECT_SEED)
    }
}
