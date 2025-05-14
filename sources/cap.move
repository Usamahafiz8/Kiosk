module kiosk::cap {
    public struct AdminCap has key, store {
        id: UID
    }

    public struct TransferCap has key {
        id: UID
    }
    

    #[allow(lint(self_transfer))]
    public fun new_admin_cap(_: &AdminCap, ctx: &mut TxContext) {
        transfer::transfer(AdminCap { id: object::new(ctx) }, ctx.sender())
    }

    public fun burn_admin_cap(admin_cap: AdminCap) {
        let AdminCap { id } = admin_cap;
        id.delete()
    }

    public(package) fun new(ctx: &mut TxContext): AdminCap {
        AdminCap { id: object::new(ctx) }
    }

    public fun create_transfer_cap(_: &AdminCap, recipient: address, ctx: &mut TxContext) {
        transfer::transfer(TransferCap { id: object::new(ctx) }, recipient)
    }

}