import "./App.css";
import { useEffect, useState } from "react";
//import { USER_DATA } from "./data";

const idb =
  window.indexedDB ||
  window.mozIndexedDB ||
  window.webkitIndexedDB ||
  window.msIndexedDB ||
  window.shimIndexedDB;

const App = () => {
  const [allUsers, setAllUsers] = useState([]);
  const [addUser, setAddUser] = useState(false);
  const [editUser, setEditUser] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [selectedUser, setSelectedUser] = useState({});
  const [age, setAge] = useState("");
  const [onlineStatus, setOnlineStatus] = useState(navigator.onLine);

  useEffect(() => {
    insertDataInIndexedDb();
    getAllData();
    // Add event listeners for online/offline status
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleOnline = () => {
    setOnlineStatus(true);
    // Handle synchronization with backend when online
    syncWithBackend();
  };

  const handleOffline = () => {
    setOnlineStatus(false);
  };

  const syncWithBackend = () => {
    allUsers.forEach(user => {
      if (user.deleted && onlineStatus) {
        deleteUserFromBackend(user);
      } else if (user.added && onlineStatus) {
        addUserToBackend(user);
      } else if (user.updated && onlineStatus) {
        updateUserOnBackend(user);
      }
    });
  };

  const insertDataInIndexedDb = () => {
    //check for support
    if (!idb) {
      console.log("This browser doesn't support IndexedDB");
      return;
    }
  
    const request = idb.open("test-db", 1);
  
    request.onerror = function (event) {
      console.error("An error occurred with IndexedDB");
      console.error(event);
    };
  
    request.onupgradeneeded = function (event) {
      console.log(event);
      const db = request.result;
  
      if (!db.objectStoreNames.contains("userData")) {
        const objectStore = db.createObjectStore("userData", { keyPath: "id" });
  
        objectStore.createIndex("age", "age", {
          unique: false,
        });
      }
    };
  
    request.onsuccess = function () {
      console.log("Database opened successfully");
  
      const db = request.result;
  
      var tx = db.transaction("userData", "readwrite");
      var userData = tx.objectStore("userData");
  
      USER_DATA.forEach((item) => userData.add(item));
  
      return tx.complete;
    };
  };
  

  const getAllData = () => {
    const dbPromise = idb.open("test-db", 1);
    dbPromise.onsuccess = () => {
      const db = dbPromise.result;

      var tx = db.transaction("userData", "readonly");
      var userData = tx.objectStore("userData");
      const users = userData.getAll();

      users.onsuccess = (query) => {
        setAllUsers(query.srcElement.result);
      };

      tx.oncomplete = function () {
        db.close();
      };
    };
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (onlineStatus) {
      // If online, directly perform data operation on backend
      performDataOperationOnBackend();
    } else {
      // If offline, store data in IndexedDB and sync later when online
      storeDataInIndexedDb();
    }
  };

  const performDataOperationOnBackend = () => {
    if (addUser) {
      addUserToBackend({
        firstName,
        lastName,
        email,
        age
      });
    } else {
      updateUserOnBackend({
        id: selectedUser.id,
        firstName,
        lastName,
        email,
        age
      });
    }
  };

  const addUserToBackend = (user) => {
    fetch("http://16.171.47.172:5000/api/admin/recruiter", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(user)
    })
    .then(response => {
      if (!response.ok) {
        throw new Error("Failed to add user");
      }
      return response.json();
    })
    .then(data => {
      setAddUser(false);
      setFirstName("");
      setLastName("");
      setEmail("");
      setAge("");
      getAllData();
    })
    .catch(error => {
      console.error("Error adding user:", error);
    });
  };

  const updateUserOnBackend = (user) => {
    fetch(`http://16.171.47.172:5000/api/admin/recruiter/${user.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(user)
    })
    .then(response => {
      if (!response.ok) {
        throw new Error("Failed to update user");
      }
      return response.json();
    })
    .then(data => {
      setEditUser(false);
      setFirstName("");
      setLastName("");
      setEmail("");
      setAge("");
      setSelectedUser({});
      getAllData();
    })
    .catch(error => {
      console.error("Error updating user:", error);
    });
  };

  const deleteUserFromBackend = (user) => {
    fetch(`http://16.171.47.172:5000/api/admin/recruiter/${user.id}`, {
      method: "DELETE"
    })
    .then(response => {
      if (!response.ok) {
        throw new Error("Failed to delete user");
      }
      return response.json();
    })
    .then(data => {
      getAllData();
    })
    .catch(error => {
      console.error("Error deleting user:", error);
    });
  };

  const deleteSelected = (user) => {
    if (onlineStatus) {
      // If online, directly perform delete operation on backend
      deleteUserFromBackend(user);
    } else {
      // If offline, store delete operation in IndexedDB and sync later when online
      storeDeleteOperationInIndexedDb(user);
    }
  };

  const storeDeleteOperationInIndexedDb = (user) => {
    // Implementation to store delete operation in IndexedDB
    const updatedUsers = allUsers.map(u => {
      if (u.id === user.id) {
        return { ...u, deleted: true };
      }
      return u;
    });
    setAllUsers(updatedUsers);
  };

  return (
    <div className="row" style={{ padding: 100 }}>
    <div className="col-md-6">
      <div>
        <button
          className="btn btn-primary float-end mb-2"
          onClick={() => {
            setFirstName("");
            setLastName("");
            setEmail("");
            setAge('')
            setEditUser(false);
            setAddUser(true);
          }}
        >
          Add
        </button>
      </div>
      <table className="table table-bordered">
        <thead>
          <tr>
            <th>First Name</th>
            <th>Last Name</th>
            <th>Age</th>
            <th>Email</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {allUsers?.map((user) => {
            return (
              <tr key={user?.id}>
                <td>{user?.firstName}</td>
                <td>{user?.lastName}</td>
                <td>{user?.age}</td>
                <td>{user?.email}</td>
                <td>
                  <button
                    className="btn btn-success"
                    onClick={() => {
                      setAddUser(false);
                      setEditUser(true);
                      setSelectedUser(user);
                      setEmail(user?.email);
                      setAge(user?.age)
                      setFirstName(user?.firstName);
                      setLastName(user?.lastName);
                    }}
                  >
                    Edit
                  </button>{" "}
                  <button
                    className="btn btn-danger"
                    onClick={() => deleteSelected(user)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    <div className="col-md-6">
      {editUser || addUser ? (
        <div className="card" style={{ padding: "20px" }}>
          <h3>{editUser ? "Update User" : "Add User"}</h3>
          <div className="form-group">
            <label>First Name</label>
            <input
              type="text"
              name="firstName"
              className="form-control"
              onChange={(e) => setFirstName(e.target.value)}
              value={firstName}
            />
          </div>
          <div className="form-group">
            <label>Last Name</label>
            <input
              type="text"
              name="lastName"
              className="form-control"
              onChange={(e) => setLastName(e.target.value)}
              value={lastName}
            />
          </div>
          <div className="form-group">
            <label>Age</label>
            <input
              type="number"
              name="age"
              className="form-control"
              onChange={(e) => setAge(e.target.value)}
              value={age}
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              className="form-control"
              onChange={(e) => setEmail(e.target.value)}
              value={email}
            />
          </div>
          <div className="form-group">
            <button
              className="btn btn-primary mt-2"
              type="submit"
              onClick={handleSubmit}
            >
              {editUser ? "Update" : "Add"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  </div>
);
};

export default App;
