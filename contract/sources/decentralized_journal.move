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
    struct Journal has key {
        daily_entries: BigOrderedMap<u64, JournalEntry>,
    }

    /// Controller for individual journal objects, provides extend_ref for extending the object
    struct JournalController has key {
        extend_ref: ExtendRef,
    }

    #[event]
    struct AddDailyEntryEvent has drop, store {
        user_journal_object_address: address,
        user_address: address,
        date_in_unix_seconds: u64,
        content: String,
    }

    #[event]
    struct DeleteDailyEntryEvent has drop, store {
        user_journal_object_address: address,
        user_address: address,
        date_in_unix_seconds: u64,
    }

    /// journal entry enum - can be extended with more data types in the future
    enum JournalEntry has store, drop, copy {
        MessageOnly {
            message: String
        }
    }

    const JOURNALS_REGISTRY_OBJECT_SEED: vector<u8> = b"my_decentralized_journal_registry";
    
    /// Error code: journal not found for the user
    const E_JOURNAL_NOT_FOUND: u64 = 1;
    /// Error code: Entry not found for the given timestamp
    const E_ENTRY_NOT_FOUND: u64 = 2;
    /// Error code: Content string exceeds maximum allowed length
    const E_CONTENT_TOO_LONG: u64 = 3;
    
    /// Maximum length for journal entry content (in bytes)
    const MAX_CONTENT_LENGTH: u64 = 10000;

    fun init_module(sender: &signer) {
        let journals_reg_constructor_ref = &object::create_named_object(sender, JOURNALS_REGISTRY_OBJECT_SEED);
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
    entry fun add_daily_entry(
        sender: &signer,
        content: String,
    ) acquires Journal, JournalsRegistry {
        // Validate content length
        let content_length = content.length();
        if (content_length > MAX_CONTENT_LENGTH) {
            abort E_CONTENT_TOO_LONG;
        };

        let sender_address = signer::address_of(sender);
        let journals_reg_obj_addr = get_journals_reg_obj_address();

        // Create journal if it doesn't exist
        if (!check_if_journal_exists(sender_address, journals_reg_obj_addr)) {
            create_journal(sender);
        };

        let now_seconds = timestamp::now_seconds();
        let journals_reg = borrow_global_mut<JournalsRegistry>(journals_reg_obj_addr);
        let journal_addr = journals_reg.all_journals.borrow(&sender_address);
        let journal = borrow_global_mut<Journal>(*journal_addr);
        let journal_entry = JournalEntry::MessageOnly { message: content };
        journal.daily_entries.add(now_seconds, journal_entry);

        event::emit(AddDailyEntryEvent {
            user_journal_object_address: *journal_addr,
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
    entry fun delete_daily_entry_by_unixtimestamp(sender: &signer, unix_timestamp: u64) acquires Journal, JournalsRegistry {
        let sender_address = signer::address_of(sender);
        let journals_reg_obj_addr = get_journals_reg_obj_address();
        
        // Check if journal exists before borrowing
        assert!(check_if_journal_exists(sender_address, journals_reg_obj_addr), E_JOURNAL_NOT_FOUND);

        let journals_reg = borrow_global_mut<JournalsRegistry>(journals_reg_obj_addr);
        let journal_addr = journals_reg.all_journals.borrow(&sender_address);
        let journal = borrow_global_mut<Journal>(*journal_addr);

        // Check if entry exists before deletion
        assert!(journal.daily_entries.contains(&unix_timestamp), E_ENTRY_NOT_FOUND);

        journal.daily_entries.remove(&unix_timestamp);

        event::emit(DeleteDailyEntryEvent {
            user_journal_object_address: *journal_addr,
            user_address: sender_address,
            date_in_unix_seconds: unix_timestamp,
        });
    }

    // ======================== Read Functions ========================

    #[view]
    public fun get_journal_object_address(user_address: address): Option<address> acquires JournalsRegistry {
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
    public fun get_journal_content_by_date(user_address: address, date: u64): Option<String> acquires Journal, JournalsRegistry {
        let journals_reg_obj_addr = get_journals_reg_obj_address();
        let journals_reg = borrow_global<JournalsRegistry>(journals_reg_obj_addr);
        let all_journals = &journals_reg.all_journals;

        // Check if the user has created a journal
        if (!all_journals.contains(&user_address)) {
            return option::none()
        };

        let journal_addr = all_journals.borrow(&user_address);

        // Check if the journal object exists
        if (!object::object_exists<Journal>(*journal_addr)) {
            return option::none()
        };

        // Get the journal and return the content
        let journal = borrow_global<Journal>(*journal_addr);
        if (journal.daily_entries.contains(&date)) {
            let journal_entry = *journal.daily_entries.borrow(&date);
            // Extract message from enum variant using helper function
            let message = extract_message_from_entry(journal_entry);
            option::some(message)
        } else {
            option::none()
        }
    }

    /// Returns the address of the journals registry object
    fun get_journals_reg_obj_address(): address {
        object::create_object_address(&@decentralized_journal_addr, JOURNALS_REGISTRY_OBJECT_SEED)
    }

    /// Helper function to extract message from journalEntry enum
    /// Uses pattern matching to extract the message from the enum variant
    fun extract_message_from_entry(entry: JournalEntry): String {
        let JournalEntry::MessageOnly { message } = entry;
        message
    }

    // ======================== Helper functions ========================

    /// Creates a new journal object for the sender and registers it in the global journals registry
    /// Also creates the journalController for extending the journal object
    fun create_journal(sender: &signer) acquires JournalsRegistry {
        let journal_constructor_ref = &object::create_object(signer::address_of(sender));

        let journal_signer = object::generate_signer(journal_constructor_ref);
        let journal_addr = signer::address_of(&journal_signer);
        
        // Create the journal resource
        move_to(&journal_signer, Journal {
            daily_entries: big_ordered_map::new_with_config(0, 0, false),
        });

        // Create the journalController for extending the object
        move_to(&journal_signer, JournalController {
            extend_ref: object::generate_extend_ref(journal_constructor_ref),
        });

        // Register the journal in the global registry
        let journals_reg_obj_addr = get_journals_reg_obj_address();
        let journals_reg = borrow_global_mut<JournalsRegistry>(journals_reg_obj_addr);
        let sender_addr = signer::address_of(sender);
        journals_reg.all_journals.add(sender_addr, journal_addr);
    }

    /// Checks if a journal exists for the given user address
    /// 
    /// Args:
    ///   - sender_address: The user's address to check
    ///   - journals_reg_obj_addr: The address of the journals registry object
    /// Returns:
    ///   - true if the journal exists, false otherwise
    fun check_if_journal_exists(sender_address: address, journals_reg_obj_addr: address): bool acquires JournalsRegistry {
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
    /// Public test-only function wrapper for add_daily_entry
    /// Allows specifying a custom timestamp for testing
    public fun add_daily_entry_for_test(
        sender: &signer,
        date: u64,
        content: String,
    ) acquires Journal, JournalsRegistry {
        let sender_address = signer::address_of(sender);
        let journals_reg_obj_addr = get_journals_reg_obj_address();

        // Create journal if it doesn't exist
        if (!check_if_journal_exists(sender_address, journals_reg_obj_addr)) {
            create_journal(sender);
        };

        // Get the journal and add the entry
        let journals_reg = borrow_global_mut<JournalsRegistry>(journals_reg_obj_addr);
        let journal_addr = journals_reg.all_journals.borrow(&sender_address);
        let journal = borrow_global_mut<Journal>(*journal_addr);
        
        // Remove existing entry if it exists (for test consistency)
        if (journal.daily_entries.contains(&date)) {
            journal.daily_entries.remove(&date);
        };

        let journal_entry = JournalEntry::MessageOnly { message: content };
        journal.daily_entries.add(date, journal_entry);

        event::emit(AddDailyEntryEvent {
            user_journal_object_address: *journal_addr,
            user_address: sender_address,
            date_in_unix_seconds: date,
            content,
        });
    }
}
