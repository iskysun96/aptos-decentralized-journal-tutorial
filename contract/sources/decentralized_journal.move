/*
    Decentralized Journal Module
    Allows users to create and maintain a decentralized journal with daily entries.
    Each user has their own journal object, and entries are stored by date (in unix seconds format).
*/

module decentralized_journal_addr::decentralized_journal {
    use std::string::String;
    use aptos_framework::object::{Self, ExtendRef};
    use aptos_framework::big_ordered_map::{Self, BigOrderedMap};
    use std::signer;
    use std::option::{Self, Option};
    use aptos_framework::event;
    use aptos_framework::timestamp;

    struct JournalsController has key {
        extend_ref: ExtendRef,
    }

    /// Global registry that maps user addresses to their journal objects
    struct JournalsRegistry has key {
        all_journals: BigOrderedMap<address, address>, // user address -> journal object address
    }

    /// Individual user journal containing daily entries
    /// Entries are stored by unix timestamp (seconds)
    struct UserJournalEntries has key {
        daily_entries: BigOrderedMap<u64, JournalEntry>,
    }

    /// Controller for individual journal objects, provides extend_ref for extending the object
    struct UserJournalController has key {
        extend_ref: ExtendRef,
    }

    #[event]    
    struct AddJournalEntryEvent has drop, store {
        user_journal_object_address: address,
        user_address: address,
        date_in_unix_seconds: u64,
        content: String,
    }

    #[event]
    struct DeleteJournalEntryEvent has drop, store {
        user_journal_object_address: address,
        user_address: address,
        date_in_unix_seconds: u64,
    }

    /// Journal entry enum - can be extended with more data types in the future
    enum JournalEntry has store, drop, copy {
        MessageOnly {
            message: String
        }
    }

    const JOURNAL_REGISTRY_OBJECT_SEED: vector<u8> = b"my_decentralized_journal_registry";
    
    /// Error code: Journal object not found for the user
    const E_USER_JOURNAL_OBJECT_DOES_NOT_EXIST: u64 = 1;
    /// Error code: Journal entry not found for the user
    const E_JOURNAL_ENTRY_NOT_FOUND: u64 = 2;
    /// Error code: Content string exceeds maximum allowed length
    const E_CONTENT_TOO_LONG: u64 = 3;
    
    /// Maximum length for journal entry content (in characters)
    const MAX_CONTENT_LENGTH: u64 = 10000;

    fun init_module(sender: &signer) {
        let journals_reg_constructor_ref = &object::create_named_object(sender, JOURNAL_REGISTRY_OBJECT_SEED);
        let journals_reg_signer = object::generate_signer(journals_reg_constructor_ref);

        move_to(&journals_reg_signer, JournalsRegistry {
            all_journals: big_ordered_map::new_with_config(0, 0, false),
        });

        move_to(&journals_reg_signer, JournalsController {
            extend_ref: object::generate_extend_ref(journals_reg_constructor_ref),
        });
    }

    // ======================== Write functions ========================

    /// Adds a daily entry to the sender's journal
    /// Creates the journal if it doesn't exist for the sender
    /// Uses the current timestamp, allowing multiple entries per day
    /// Users can add as many entries as they want
    /// 
    /// Args:
    ///   - content: String content of the journal entry (max length: MAX_CONTENT_LENGTH)
    entry public fun add_journal_entry(
        sender: &signer,
        content: String,
    ) acquires UserJournalEntries, JournalsRegistry {
        // Validate content length
        let content_length = content.length();
        if (content_length > MAX_CONTENT_LENGTH) {
            abort E_CONTENT_TOO_LONG;
        };

        let sender_address = signer::address_of(sender);
        let journals_reg_obj_addr = get_journals_reg_obj_address();

        // Create journal if it doesn't exist
        if (!check_if_user_journal_object_exists(sender_address, journals_reg_obj_addr)) {
            create_user_journal_object(sender);
        };

        let journals_reg = borrow_global_mut<JournalsRegistry>(journals_reg_obj_addr);
        let user_journal_object_address = journals_reg.all_journals.borrow(&sender_address);
        let user_journal_object = borrow_global_mut<UserJournalEntries>(*user_journal_object_address);
        let journal_entry = JournalEntry::MessageOnly { message: content };

        let now_seconds = timestamp::now_seconds();
        user_journal_object.daily_entries.add(now_seconds, journal_entry);

        event::emit(AddJournalEntryEvent {
            user_journal_object_address: *user_journal_object_address,
            user_address: sender_address,
            date_in_unix_seconds: now_seconds,
            content,
        });
    }

    /// Deletes a daily entry from the sender's journal by unix timestamp
    /// Only deletes if the entry exists
    /// 
    /// Args:
    ///   - unix_timestamp: Unix timestamp (in seconds) of the entry to delete
    entry public fun delete_journal_entry_by_unixtimestamp(sender: &signer, unix_timestamp: u64) acquires UserJournalEntries, JournalsRegistry {
        let sender_address = signer::address_of(sender);
        let journals_reg_obj_addr = get_journals_reg_obj_address();
        
        // Check if journal exists before borrowing
        assert!(check_if_user_journal_object_exists(sender_address, journals_reg_obj_addr), E_USER_JOURNAL_OBJECT_DOES_NOT_EXIST);

        let journals_reg = borrow_global_mut<JournalsRegistry>(journals_reg_obj_addr);
        let user_journal_object_address = journals_reg.all_journals.borrow(&sender_address);
        let user_journal_object = borrow_global_mut<UserJournalEntries>(*user_journal_object_address);

        // Check if entry exists before deletion
        assert!(user_journal_object.daily_entries.contains(&unix_timestamp), E_JOURNAL_ENTRY_NOT_FOUND);

        user_journal_object.daily_entries.remove(&unix_timestamp);

        event::emit(DeleteJournalEntryEvent {
            user_journal_object_address: *user_journal_object_address,
            user_address: sender_address,
            date_in_unix_seconds: unix_timestamp,
        });
    }

    // ======================== Read Functions ========================

    #[view]
    public fun get_user_journal_object_address(user_address: address): Option<address> acquires JournalsRegistry {
        let journals_reg_obj_addr = get_journals_reg_obj_address();
        let journals_reg = borrow_global<JournalsRegistry>(journals_reg_obj_addr);
        let all_journals = &journals_reg.all_journals;

        // Check if the user has created a journal
        if (!all_journals.contains(&user_address)) {
            return option::none()
        };

        let journal_addr = all_journals.borrow(&user_address);
        option::some(*journal_addr)
    }

    #[view]
    public fun get_journal_entry_by_date(user_address: address, date: u64): Option<String> acquires UserJournalEntries, JournalsRegistry {
        let journals_reg_obj_addr = get_journals_reg_obj_address();
        let journals_reg = borrow_global<JournalsRegistry>(journals_reg_obj_addr);
        let all_journals = &journals_reg.all_journals;

        // Check if the user has created a journal
        if (!all_journals.contains(&user_address)) {
            return option::none()
        };

        let user_journal_object_address = all_journals.borrow(&user_address);

        // Get the journal and return the content
        let user_journal_object = borrow_global<UserJournalEntries>(*user_journal_object_address);
        if (user_journal_object.daily_entries.contains(&date)) {
            let journal_entry = *user_journal_object.daily_entries.borrow(&date);
            // Extract message from enum variant
            let JournalEntry::MessageOnly { message } = journal_entry;
            option::some(message)
        } else {
            option::none()
        }
    }

    /// Returns the address of the journals registry object
    fun get_journals_reg_obj_address(): address {
        object::create_object_address(&@decentralized_journal_addr, JOURNAL_REGISTRY_OBJECT_SEED)
    }

    // ======================== Helper functions ========================

    /// Creates a new journal object for the sender and registers it in the global Journals registry
    /// Also creates the JournalController for extending the journal object
    fun create_user_journal_object(sender: &signer) acquires JournalsRegistry {
        let journal_constructor_ref = &object::create_object(signer::address_of(sender));

        let journal_signer = object::generate_signer(journal_constructor_ref);
        let user_journal_object_address = signer::address_of(&journal_signer);
        
        // Create the Journal resource
        move_to(&journal_signer, UserJournalEntries {
            daily_entries: big_ordered_map::new_with_config(0, 0, false),
        });

        // Create the UserJournalController for extending the object
        move_to(&journal_signer, UserJournalController {
            extend_ref: object::generate_extend_ref(journal_constructor_ref),
        });

        // Register the user journal object in the global registry
        let journals_reg_obj_addr = get_journals_reg_obj_address();
        let journals_reg = borrow_global_mut<JournalsRegistry>(journals_reg_obj_addr);
        let sender_addr = signer::address_of(sender);
        journals_reg.all_journals.add(sender_addr, user_journal_object_address);
    }

    /// Checks if a journal object exists for the given user address
    /// 
    /// Args:
    ///   - sender_address: The user's address to check
    ///   - journals_reg_obj_addr: The address of the journals registry object
    /// Returns:
    ///   - true if the journal object exists, false otherwise
    fun check_if_user_journal_object_exists(sender_address: address, journals_reg_obj_addr: address): bool acquires JournalsRegistry {
        let journals_reg = borrow_global<JournalsRegistry>(journals_reg_obj_addr);
        journals_reg.all_journals.contains(&sender_address)
    }

    // ======================== Test-only functions ========================

    #[test_only]
    /// Public test-only function to initialize the module
    public fun init_module_for_test(sender: &signer) {
        init_module(sender);
    }

    #[test_only]
    /// Public test-only function wrapper for add_journal
    /// Allows specifying a custom timestamp for testing
    public fun add_journal_for_test(
        sender: &signer,
        date: u64,
        content: String,
    ) acquires UserJournalEntries, JournalsRegistry {
        // Validate content length
        let content_length = content.length();
        if (content_length > MAX_CONTENT_LENGTH) {
            abort E_CONTENT_TOO_LONG;
        };

        let sender_address = signer::address_of(sender);
        let journals_reg_obj_addr = get_journals_reg_obj_address();

        // Create journal if it doesn't exist
        if (!check_if_user_journal_object_exists(sender_address, journals_reg_obj_addr)) {
            create_user_journal_object(sender);
        };

        // Get the journal and add the entry
        let journals_reg = borrow_global_mut<JournalsRegistry>(journals_reg_obj_addr);
        let journal_addr = journals_reg.all_journals.borrow(&sender_address);
        let user_journal_object = borrow_global_mut<UserJournalEntries>(*journal_addr);
        let journal_entry = JournalEntry::MessageOnly { message: content };
        user_journal_object.daily_entries.add(date, journal_entry);

        event::emit(AddJournalEntryEvent {
            user_journal_object_address: *journal_addr,
            user_address: sender_address,
            date_in_unix_seconds: date,
            content,
        });
    }
}