module kiosk::nft {
    use kiosk::cap::AdminCap;
    use kiosk::counter::{Self, Counter as DynamicCounter};
    use kiosk::package;

    const EWrongVersion: u64 = 0;

    public struct NFT1 has drop {}
    public struct NFT2 has drop {}
    public struct NFT3 has drop {}


    public struct Public<phantom T> has key, store {
        id: UID,
        mint_number: u64,
    }


    public fun mint_and_transfer_public<T>(
        _: &AdminCap,
        counter: &mut DynamicCounter, 
        recipient: address,
        ctx: &mut TxContext
    ) {
        assert!(package::version() == counter.version(), EWrongVersion);

        counter.incr_counter<T>();
        let poap = Public<T> {
            id: object::new(ctx),
            mint_number: counter.num_minted<T>()
        };
        transfer::transfer(poap, recipient);
    }

    public fun add_field<T>(_: &AdminCap, counter: &mut DynamicCounter) {
        assert!(package::version() == counter.version(), EWrongVersion);
        counter::add_field<T>(counter);
    }
}