#[test_only]
module decentralized_journal_addr::test_end_to_end {
    use std::string;
    use decentralized_journal_addr::decentralized_journal;

    const TEST_DATE_1: u64 = 20241031; // October 31, 2024
    const TEST_DATE_2: u64 = 20241101; // November 1, 2024
    const TEST_DATE_3: u64 = 20241102; // November 2, 2024

    #[test(publisher = @decentralized_journal_addr, user = @0x100)]
    fun test_basic_journal_operations(publisher: &signer, user: &signer) {
        decentralized_journal::init_module_for_test(publisher);
        
        let user_addr = std::signer::address_of(user);
        let content1 = string::utf8(b"Today was a great day!");
        let content2 = string::utf8(b"Another wonderful day");
        
        decentralized_journal::add_daily_entry_for_test(user, TEST_DATE_1, content1);
        
        let entry1 = decentralized_journal::get_journal_content_by_date(user_addr, TEST_DATE_1);
        assert!(entry1.is_some(), 1);
        let retrieved_content1 = *entry1.borrow();
        assert!(retrieved_content1 == string::utf8(b"Today was a great day!"), 2);
        
        decentralized_journal::add_daily_entry_for_test(user, TEST_DATE_2, content2);
        
        let entry2 = decentralized_journal::get_journal_content_by_date(user_addr, TEST_DATE_2);
        assert!(entry2.is_some(), 3);
        let retrieved_content2 = *entry2.borrow();
        assert!(retrieved_content2 == string::utf8(b"Another wonderful day"), 4);
    }

    // Test multiple users with separate diaries
    #[test(publisher = @decentralized_journal_addr, user1 = @0x567)]
    fun test_multiple_users_user1(publisher: &signer, user1: &signer) {
        decentralized_journal::init_module_for_test(publisher);
        
        let content_user1 = string::utf8(b"User 1's journal entry");
        
        // User 1 adds entry
        decentralized_journal::add_daily_entry_for_test(user1, TEST_DATE_1, content_user1);
        
        // Verify user 1's entry
        let user1_addr = std::signer::address_of(user1);
        let user1_entry = decentralized_journal::get_journal_content_by_date(user1_addr, TEST_DATE_1);
        
        assert!(user1_entry.is_some(), 5);
        let user1_content = *user1_entry.borrow();
        assert!(user1_content == string::utf8(b"User 1's journal entry"), 6);
    }

    #[test(publisher = @decentralized_journal_addr, user1 = @0x567, user2 = @0x2)]
    fun test_multiple_users_user2(publisher: &signer, user1: &signer, user2: &signer) {
        test_multiple_users_user1(publisher, user1);
        
        let content_user2 = string::utf8(b"User 2's journal entry");
        
        // User 2 adds entry
        decentralized_journal::add_daily_entry_for_test(user2, TEST_DATE_1, content_user2);
        
        // Verify user 2's entry
        let user2_addr = std::signer::address_of(user2);
        let user2_entry = decentralized_journal::get_journal_content_by_date(user2_addr, TEST_DATE_1);
        
        assert!(user2_entry.is_some(), 7);
        let user2_content = *user2_entry.borrow();
        assert!(user2_content == string::utf8(b"User 2's journal entry"), 8);
    }

    #[test(publisher = @decentralized_journal_addr, user = @0x101)]
    fun test_nonexistent_entry(publisher: &signer, user: &signer) {
        decentralized_journal::init_module_for_test(publisher);
        
        let user_addr = std::signer::address_of(user);
        
        let entry = decentralized_journal::get_journal_content_by_date(user_addr, TEST_DATE_1);
        assert!(entry.is_none(), 9);
        
        decentralized_journal::add_daily_entry_for_test(user, TEST_DATE_1, string::utf8(b"Entry 1"));
        
        let nonexistent_entry = decentralized_journal::get_journal_content_by_date(user_addr, TEST_DATE_2);
        assert!(nonexistent_entry.is_none(), 10);
        
        let existing_entry = decentralized_journal::get_journal_content_by_date(user_addr, TEST_DATE_1);
        assert!(existing_entry.is_some(), 11);
    }

    #[test(publisher = @decentralized_journal_addr, user = @0x102)]
    fun test_overwrite_entry(publisher: &signer, user: &signer) {
        decentralized_journal::init_module_for_test(publisher);
        
        let user_addr = std::signer::address_of(user);
        let original_content = string::utf8(b"Original entry");
        let updated_content = string::utf8(b"Updated entry");
        
        decentralized_journal::add_daily_entry_for_test(user, TEST_DATE_1, original_content);
        
        let entry1 = decentralized_journal::get_journal_content_by_date(user_addr, TEST_DATE_1);
        assert!(entry1.is_some(), 12);
        let content1 = *entry1.borrow();
        assert!(content1 == string::utf8(b"Original entry"), 13);
        
        decentralized_journal::add_daily_entry_for_test(user, TEST_DATE_1, updated_content);
        
        let entry2 = decentralized_journal::get_journal_content_by_date(user_addr, TEST_DATE_1);
        assert!(entry2.is_some(), 14);
        let content2 = *entry2.borrow();
        assert!(content2 == string::utf8(b"Updated entry"), 15);
    }

    #[test(publisher = @decentralized_journal_addr, user = @0x103)]
    fun test_multiple_dates(publisher: &signer, user: &signer) {
        decentralized_journal::init_module_for_test(publisher);
        
        let user_addr = std::signer::address_of(user);
        
        decentralized_journal::add_daily_entry_for_test(user, TEST_DATE_1, string::utf8(b"Day 1 entry"));
        decentralized_journal::add_daily_entry_for_test(user, TEST_DATE_2, string::utf8(b"Day 2 entry"));
        decentralized_journal::add_daily_entry_for_test(user, TEST_DATE_3, string::utf8(b"Day 3 entry"));
        
        let entry1 = decentralized_journal::get_journal_content_by_date(user_addr, TEST_DATE_1);
        let entry2 = decentralized_journal::get_journal_content_by_date(user_addr, TEST_DATE_2);
        let entry3 = decentralized_journal::get_journal_content_by_date(user_addr, TEST_DATE_3);
        
        assert!(entry1.is_some(), 16);
        assert!(entry2.is_some(), 17);
        assert!(entry3.is_some(), 18);
        
        let content1 = *entry1.borrow();
        let content2 = *entry2.borrow();
        let content3 = *entry3.borrow();
        
        assert!(content1 == string::utf8(b"Day 1 entry"), 19);
        assert!(content2 == string::utf8(b"Day 2 entry"), 20);
        assert!(content3 == string::utf8(b"Day 3 entry"), 21);
    }

    #[test(publisher = @decentralized_journal_addr, user = @0x104)]
    fun test_auto_create_journal(publisher: &signer, user: &signer) {
        decentralized_journal::init_module_for_test(publisher);
        
        let user_addr = std::signer::address_of(user);
        
        let entry_before = decentralized_journal::get_journal_content_by_date(user_addr, TEST_DATE_1);
        assert!(entry_before.is_none(), 22);
        
        decentralized_journal::add_daily_entry_for_test(user, TEST_DATE_1, string::utf8(b"First entry"));
        
        let entry_after = decentralized_journal::get_journal_content_by_date(user_addr, TEST_DATE_1);
        assert!(entry_after.is_some(), 23);
        let content = *entry_after.borrow();
        assert!(content == string::utf8(b"First entry"), 24);
    }

    #[test(publisher = @decentralized_journal_addr, user = @0x105)]
    fun test_empty_content(publisher: &signer, user: &signer) {
        decentralized_journal::init_module_for_test(publisher);
        
        let user_addr = std::signer::address_of(user);
        let empty_content = string::utf8(b"");
        
        decentralized_journal::add_daily_entry_for_test(user, TEST_DATE_1, empty_content);
        
        let entry = decentralized_journal::get_journal_content_by_date(user_addr, TEST_DATE_1);
        assert!(entry.is_some(), 25);
        let content = *entry.borrow();
        assert!(content == string::utf8(b""), 26);
    }

    #[test(publisher = @decentralized_journal_addr, user = @0x106)]
    fun test_long_content(publisher: &signer, user: &signer) {
        decentralized_journal::init_module_for_test(publisher);
        
        let user_addr = std::signer::address_of(user);
        let long_content = string::utf8(b"This is a very long journal entry that contains multiple sentences and should test the system's ability to handle longer strings. It includes various characters and should work correctly.");
        
        decentralized_journal::add_daily_entry_for_test(user, TEST_DATE_1, long_content);
        
        let entry = decentralized_journal::get_journal_content_by_date(user_addr, TEST_DATE_1);
        assert!(entry.is_some(), 27);
        let content = *entry.borrow();
        assert!(content == string::utf8(b"This is a very long journal entry that contains multiple sentences and should test the system's ability to handle longer strings. It includes various characters and should work correctly."), 28);
    }
}
