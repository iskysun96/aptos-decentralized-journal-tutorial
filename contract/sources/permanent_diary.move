/*
    Permanent Diary Module
    Allows users to create and maintain a permanent diary with daily entries.
    Each user has their own diary object, and entries are stored by date (YYYYMMDD format).
*/

module permanent_diary_addr::permanent_diary {
    use std::string::String;
    use aptos_framework::object::{Self, ExtendRef};
    use aptos_framework::big_ordered_map::{Self, BigOrderedMap};
    use std::signer;
    use std::option::{Self, Option};
    use aptos_framework::event;

    // struct Diaries has key {
    //     all_diaries: BigOrderedMap<address, Object<Diary>>,
    // }

    struct DiariesRegistryObjectAddress has key {
        diary_registry_object_address: address,
    }

    struct DiariesController has key {
        extend_ref: ExtendRef,
    }

    /// Global registry that maps user addresses to their diary objects
    struct DiariesRegistry has key {
        publisher_address: address,
        all_diaries: BigOrderedMap<address, address>, // user address -> diary object address
    }


    /// Individual user diary containing daily entries
    /// Date format: YYYYMMDD (e.g., 20241031 for October 31, 2024)
    struct Diary has key {
        daily_entries: BigOrderedMap<u64, String>,
    }


    /// Controller for individual diary objects, provides extend_ref for extending the object
    struct DiaryController has key {
        extend_ref: ExtendRef,
    }

    #[event]
    struct AddDailyEntryEvent has drop, store {
        user_diary_object_address: address,
        user_address: address,
        date: u64,
        content: String,
    }


    fun init_module(sender: &signer) {
        let publisher_addr = signer::address_of(sender);


        let diaries_reg_constructor_ref = &object::create_object(signer::address_of(sender));
        let diaries_reg_signer = object::generate_signer(diaries_reg_constructor_ref);
        let diaries_reg_address = object::address_from_constructor_ref(diaries_reg_constructor_ref);

        move_to(&diaries_reg_signer, DiariesRegistry {
            publisher_address: publisher_addr,
            all_diaries: big_ordered_map::new_with_config(0, 0, false),
        });

        move_to(&diaries_reg_signer, DiariesController {
            extend_ref: object::generate_extend_ref(diaries_reg_constructor_ref),
        });

        // let diaries_reg_object = object::address_to_object<DiariesRegistry>(diaries_reg_address);
        move_to(sender, DiariesRegistryObjectAddress {
            diary_registry_object_address: diaries_reg_address,
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
    ) acquires Diary, DiariesRegistry, DiariesRegistryObjectAddress {
        let sender_address = signer::address_of(sender);

        let diaries_reg_obj_addr = get_diaries_obj_address();

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
        diary.daily_entries.add(date, content);

        event::emit(AddDailyEntryEvent {
            user_diary_object_address: *diary_addr,
            user_address: sender_address,
            date,
            content,
        });
    }

    // ======================== Read Functions ========================

    #[view]
    public fun get_diary_object_address(user_address: address): Option<address> acquires DiariesRegistryObjectAddress, DiariesRegistry {
        let diaries_reg_obj_addr = get_diaries_obj_address();
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
    public fun get_diary_content_by_date(user_address: address, date: u64): Option<String> acquires Diary, DiariesRegistryObjectAddress, DiariesRegistry {
        let diaries_reg_obj_addr = get_diaries_obj_address();
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
            option::some(*diary.daily_entries.borrow(&date))
        } else {
            option::none()
        }
    }

    // ======================== Helper functions ========================

    /// Creates a new diary object for the sender and registers it in the global Diaries registry
    /// Also creates the DiaryController for extending the diary object
    fun create_diary(
        sender: &signer
    ) acquires DiariesRegistry, DiariesRegistryObjectAddress {
        let diary_controller = &object::create_object(signer::address_of(sender));

        let diary_signer = object::generate_signer(diary_controller);
        let diary_addr = signer::address_of(&diary_signer);
        
        // Create the Diary resource
        move_to(&diary_signer, Diary {
            daily_entries: big_ordered_map::new_with_config(0, 0, false),
        });

        // Create the DiaryController for extending the object
        move_to(&diary_signer, DiaryController {
            extend_ref: object::generate_extend_ref(diary_controller),
        });

        // Register the diary in the global registry
        let diaries_reg_obj_addr = get_diaries_obj_address();
        // debug::print(&diaries_address);
        let diaries_reg = borrow_global_mut<DiariesRegistry>(diaries_reg_obj_addr);
        let sender_addr = signer::address_of(sender);
        diaries_reg.all_diaries.add(sender_addr, diary_addr);
    }

    fun get_diaries_obj_address(): address acquires DiariesRegistryObjectAddress {
        let diaries_reg_obj_addr = borrow_global<DiariesRegistryObjectAddress>(@permanent_diary_addr).diary_registry_object_address;
        diaries_reg_obj_addr
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
    ) acquires Diary, DiariesRegistry, DiariesRegistryObjectAddress {
        add_daily_entry(sender, date, content);
    }
}
