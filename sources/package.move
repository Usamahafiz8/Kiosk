
module kiosk::package {
    
    /// This should be updated whenever the package is upgraded.
    const VERSION: u16 = 1;
    
    public struct PACKAGE has drop {}
    
    public fun version(): u16 { VERSION }
}
