#[test_only]
module decentralized_journal_addr::test_end_to_end {
    use std::string;
    use decentralized_journal_addr::decentralized_journal;

    const TEST_DATE_1: u64 = 20241031; // October 31, 2024
    const TEST_DATE_2: u64 = 20241101; // November 1, 2024

    #[test(publisher = @decentralized_journal_addr, user = @0x100)]
    fun test_add_journal_for_test(publisher: &signer, user: &signer) {
        decentralized_journal::init_module_for_test(publisher);
        
        let user_addr = std::signer::address_of(user);
        let content1 = string::utf8(b"Today was a great day!");
        let content2 = string::utf8(b"Another wonderful day");
        
        decentralized_journal::add_journal_for_test(user, TEST_DATE_1, content1);
        
        let entry1 = decentralized_journal::get_journal_entry_by_date(user_addr, TEST_DATE_1);
        assert!(entry1.is_some(), 1);
        let retrieved_content1 = *entry1.borrow();
        assert!(retrieved_content1 == string::utf8(b"Today was a great day!"), 2);
        
        decentralized_journal::add_journal_for_test(user, TEST_DATE_2, content2);
        
        let entry2 = decentralized_journal::get_journal_entry_by_date(user_addr, TEST_DATE_2);
        assert!(entry2.is_some(), 3);
        let retrieved_content2 = *entry2.borrow();
        assert!(retrieved_content2 == string::utf8(b"Another wonderful day"), 4);
    }

    #[test(publisher = @decentralized_journal_addr, user = @0x100)]
    fun test_delete_daily_entry_for_test(publisher: &signer, user: &signer) {
        decentralized_journal::init_module_for_test(publisher);
        
        let user_addr = std::signer::address_of(user);
        
        decentralized_journal::add_journal_for_test(user, TEST_DATE_1, string::utf8(b"First entry"));
        
        let entry_after = decentralized_journal::get_journal_entry_by_date(user_addr, TEST_DATE_1);
        assert!(entry_after.is_some(), 23);
        let content = *entry_after.borrow();
        assert!(content == string::utf8(b"First entry"), 24);

        decentralized_journal::delete_journal_entry_by_unixtimestamp(user, TEST_DATE_1);

        let entry_after = decentralized_journal::get_journal_entry_by_date(user_addr, TEST_DATE_1);
        assert!(entry_after.is_none(), 25);
    }


}
