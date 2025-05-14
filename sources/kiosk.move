module kiosk::kiosk{

     
     use sui::package;

    use kiosk::cap;
    use kiosk::counter;

public struct KIOSK has drop {}

    #[allow(lint(share_owned))]
    fun init(otw: KIOSK, ctx: &mut TxContext) {
        let publisher = package::claim(otw, ctx);
        let admin_cap = cap::new(ctx);
        let mut counter = counter::new(ctx);


        transfer::public_transfer(admin_cap, ctx.sender());
        transfer::public_transfer(publisher, ctx.sender());
        transfer::public_share_object(counter);
    }

}
