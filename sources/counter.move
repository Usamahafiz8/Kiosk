module kiosk::counter {
    use sui::dynamic_field::{ Self };

    public struct AssetKey<phantom T> has copy, store, drop {}

    public struct Counter has key, store {
        id: UID,
        version: u16,
    }

    public fun version(self: &Counter): u16 {
        self.version
    }
    // In kiosk::counter
public fun new(ctx: &mut TxContext): Counter {
    Counter {
        id: object::new(ctx),
        version: 1 // or package::version()
    }
}

    public fun num_minted<T>(counter: &Counter): u64 {
        *dynamic_field::borrow<AssetKey<T>, u64>(&counter.id, AssetKey<T> {})
    }
  
    public(package) fun add_field<T>(counter: &mut Counter) {
        dynamic_field::add<AssetKey<T>, u64>(&mut counter.id, AssetKey<T> {}, 0)
    }

    public(package) fun incr_counter<T>(counter: &mut Counter) {
        let counter = dynamic_field::borrow_mut<AssetKey<T>, u64>(&mut counter.id, AssetKey<T> {});
        *counter = *counter + 1;
    }
}