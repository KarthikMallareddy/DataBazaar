use candid::{CandidType, Principal};
use ic_cdk::api::caller;
use ic_stable_structures::memory_manager::{MemoryId, MemoryManager, VirtualMemory};
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap, Storable};
use ic_stable_structures::storable::Bound;
use serde::{Deserialize, Serialize};
use std::borrow::Cow;
use std::cell::RefCell;

type Memory = VirtualMemory<DefaultMemoryImpl>;

#[derive(CandidType, Serialize, Deserialize, Clone)]
pub struct DataListing {
    pub id: u64,
    pub name: String,
    pub description: String,
    pub price: u64,
    pub owner: Principal,
    pub data_content: Vec<u8>, // Store CSV data as bytes
    pub created_at: u64,
}

impl Storable for DataListing {
    const BOUND: Bound = Bound::Unbounded;

    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(candid::encode_one(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        candid::decode_one(&bytes).unwrap()
    }
}

thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> = RefCell::new(
        MemoryManager::init(DefaultMemoryImpl::default())
    );

    static DATA_LISTINGS: RefCell<StableBTreeMap<u64, DataListing, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(0)))
        )
    );

    static NEXT_ID: RefCell<u64> = RefCell::new(1);
}

#[ic_cdk::query]
fn greet(name: String) -> String {
    format!("Hello, {}!", name)
}

#[ic_cdk::update]
fn create_data_listing(name: String, description: String, price: u64) -> Result<u64, String> {
    let id = NEXT_ID.with(|counter| {
        let current = *counter.borrow();
        *counter.borrow_mut() = current + 1;
        current
    });

    let listing = DataListing {
        id,
        name: name.clone(),
        description,
        price,
        owner: caller(),
        data_content: Vec::new(), // Empty for now, will be filled by upload_data
        created_at: ic_cdk::api::time(),
    };

    DATA_LISTINGS.with(|listings| {
        listings.borrow_mut().insert(id, listing);
    });

    Ok(id)
}

#[ic_cdk::update]
fn upload_data(listing_id: u64, data: Vec<u8>) -> Result<String, String> {
    DATA_LISTINGS.with(|listings| {
        let mut listings_mut = listings.borrow_mut();
        match listings_mut.get(&listing_id) {
            Some(mut listing) => {
                if listing.owner != caller() {
                    return Err("Only the owner can upload data".to_string());
                }
                listing.data_content = data;
                listings_mut.insert(listing_id, listing);
                Ok("Data uploaded successfully".to_string())
            }
            None => Err("Listing not found".to_string()),
        }
    })
}

#[ic_cdk::query]
fn get_listings() -> Vec<DataListing> {
    DATA_LISTINGS.with(|listings| {
        listings
            .borrow()
            .iter()
            .map(|(_, listing)| {
                let mut public_listing = listing.clone();
                // Don't return the actual data content in listings, just metadata
                public_listing.data_content = Vec::new();
                public_listing
            })
            .collect()
    })
}

#[ic_cdk::query]
fn get_listing(id: u64) -> Result<DataListing, String> {
    DATA_LISTINGS.with(|listings| {
        match listings.borrow().get(&id) {
            Some(listing) => Ok(listing),
            None => Err("Listing not found".to_string()),
        }
    })
}

#[ic_cdk::query]
fn get_my_listings() -> Vec<DataListing> {
    let caller_principal = caller();
    DATA_LISTINGS.with(|listings| {
        listings
            .borrow()
            .iter()
            .filter(|(_, listing)| listing.owner == caller_principal)
            .map(|(_, listing)| {
                let mut public_listing = listing.clone();
                public_listing.data_content = Vec::new();
                public_listing
            })
            .collect()
    })
}
