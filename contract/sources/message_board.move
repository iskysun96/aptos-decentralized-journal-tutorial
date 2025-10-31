/*
    Permanent Diary 
    This is a permanent diary contract that allows users to post messages and read them.

*/

module permanent_diary_addr::permanent_diary {
    use std::string::String;
    use aptos_framework::object::{Self, ExtendRef, Object};
    use aptos_framework::big_ordered_map::{Self, BigOrderedMap};
    use std::signer;



    struct Diaries has key {
        all_diaries: BigOrderedMap<address, Object<Diary>>,
    }

    struct DiariesController has key {
        extend_ref: ExtendRef,
    }

    #[resource_group_member(group = aptos_framework::object::ObjectGroup)]
    struct Diary has key {
        daily_entries: BigOrderedMap<u64, String>, //u64 should be the date in this format: YYYYMMDD
    }

    #[resource_group_member(group = aptos_framework::object::ObjectGroup)]
    struct DiaryController has key {
        extend_ref: ExtendRef,
    }

    const DIARY_OBJECT_SEED: vector<u8> = b"my_permanent_diary";
    const DIARIES_OBJECT_SEED: vector<u8> = b"all_diaries";

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


    entry fun add_daily_entry(
        _sender: &signer,
        date: u64,
        content: String,
    ) {
        let sender_address = signer::address_of(_sender);
        let diary_address = object::create_object_address(&sender_address, DIARY_OBJECT_SEED);

        if (!object::object_exists(diary_address)) {
            create_diary(_sender);
        };

        let diary_struct = Diary {
            daily_entries: big_ordered_map::new()
        };

        diary_struct.daily_entries.add(date, content);

        let diary_extend_ref = borrow_global<DiaryController>(diary_address).extend_ref;

        move_to(&object::generate_signer_for_extending(&diary_extend_ref), diary_struct);
    }


    // ======================== Read Functions ========================
    
    //TODO: get diary content by date

    // ======================== Helper functions ========================

    fun create_diary(
        _sender: &signer
    ) {
        let diary_controller = &object::create_named_object(_sender, DIARY_OBJECT_SEED);
        let diary_address = object::address_from_constructor_ref(diary_controller);
        move_to(&object::generate_signer(diary_controller), Diary {
            daily_entries: big_ordered_map::new(),
        });

        let diaries_address = get_diaries_obj_address();
        let diaries = borrow_global_mut<Diaries>(diaries_address);
        diaries.all_diaries.add(signer::address_of(_sender), object::address_to_object(diary_address));
    }

    fun get_diaries_obj_address(): address {
        object::create_object_address(&@message_board_addr, DIARIES_OBJECT_SEED)
    }
}
