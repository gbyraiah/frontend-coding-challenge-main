import React from "react";
import { connect } from "react-redux";

import {
  fetchAddresses,
  fetchEvents,
  fetchSelectedEventDetails,
} from "./thunks";
import { eventGuid, canSelectEvents, undeletedAddresses } from "./selectors";
import { actions } from "./redux-store";
import Modal from "react-modal";
import ReactJsonViewCompare from "react-json-view-compare";

//--> User select form
const submitHandler = (dispatch, userId) => (e) => {
  e.preventDefault();

  dispatch({
    type: actions.CHANGE_SELECTED_USER_ID,
    payload: userId,
  });
};

const changeHandler = (dispatch) => (e) => {
  const val = e.target.value;

  dispatch({
    type: actions.CHANGE_SELECTED_USER_ID,
    payload: val,
  });
  dispatch(fetchAddresses(val));
};

let UserSelectForm = ({ dispatch, userIds, selectedUserId }) => {
  return (
    <form
      action="{API_BASE}/users/{selectedUserId}/addresses"
      method="GET"
      onSubmit={submitHandler(dispatch, selectedUserId)}
    >
      <select onChange={changeHandler(dispatch)} value={selectedUserId || ""}>
        <option>Select User ID</option>
        {userIds.map((id) => {
          return (
            <option key={id} value={id}>
              {id}
            </option>
          );
        })}
      </select>
    </form>
  );
};
UserSelectForm = connect((state) => state)(UserSelectForm);

//--> Events list
const handleEventToggle = (dispatch, guid, event) => (e) => {
  dispatch({
    type: actions.TOGGLE_EVENT_SELECTION,
    payload: event.id,
  });
};
let Event = ({ dispatch, event, guid, isSelected, isEnabled }) => {
  return (
    <li>
      <input
        id={event.id}
        type="checkbox"
        checked={isSelected}
        disabled={!isEnabled}
        onChange={handleEventToggle(dispatch, guid, event)}
      />
      <label htmlFor={event.id}>
        {event.type} | {event.created_at}
      </label>
    </li>
  );
};
Event = connect((state, ownProps) => {
  const isSelected = !!state.selectedEvents[ownProps.event.id];
  return {
    isSelected: isSelected,
    isEnabled: isSelected || canSelectEvents(state.selectedEvents),
  };
})(Event);

const handleCompareClick = (dispatch) => (e) => {
  dispatch({
    type: actions.OPEN_MODAL_POPUP,
  });
  /*
   * Your code here (and probably elsewhere)
   *
   *
   * We've provided a thunk function to fetch
   * event data.
   * Find it in thunks.js, lines 81-107,
   * and referenced in the comment below on line 78.
   */
  // dispatch(fetchSelectedEventDetails())
};

let EventList = ({ dispatch, canCompare, events }) => {
  return (
    <>
      <button onClick={handleCompareClick(dispatch)} disabled={!canCompare}>
        Compare
      </button>
      <ul>
        {events.map((event) => {
          return (
            <Event
              event={event}
              key={eventGuid(event)}
              guid={eventGuid(event)}
            />
          );
        })}
      </ul>
    </>
  );
};
EventList = connect((state) => {
  return { canCompare: Object.keys(state.selectedEvents).length > 1 };
})(EventList);

//--> Addresses list
const handleAddressClick = (dispatch, id) => (e) => {
  e.preventDefault();

  dispatch({
    type: actions.REQUEST_ADDRESS_DETAILS,
    payload: id,
  });
  dispatch(fetchEvents(id));
};

let Address = ({ dispatch, addressJson, isSelected }) => {
  return (
    <li
      onClick={handleAddressClick(dispatch, addressJson.id)}
      className={isSelected ? "selected" : ""}
    >
      <pre>{JSON.stringify(addressJson, undefined, 2)}</pre>
    </li>
  );
};
Address = connect((state, ownProps) => {
  return { isSelected: state.selectedAddressId === ownProps.addressJson.id };
})(Address);
let ModalPopup = ({ events, selectedEvents, dispatch }) => {
  const [evnt1Id, evnt2Id] = Object.keys(selectedEvents);
  const evnt = events.find((e) => e.id === evnt1Id);
  const evnt1 = events.find((e) => e.id === evnt2Id);

  const diff = (obj1, obj2) => {
    const result = {};
    if (Object.is(obj1, obj2)) {
      return undefined;
    }
    if (!obj2 || typeof obj2 !== "object") {
      return obj2;
    }
    Object.keys(obj1 || {})
      .concat(Object.keys(obj2 || {}))
      .forEach((key) => {
        if (obj2[key] !== obj1[key] && !Object.is(obj1[key], obj2[key])) {
          result[key] = obj2[key];
        }
        if (typeof obj2[key] === "object" && typeof obj1[key] === "object") {
          const value = diff(obj1[key], obj2[key]);
          if (value !== undefined) {
            result[key] = value;
          }
        }
      });
    console.log(result);
    return result;
  };
  const result1 = diff(evnt, evnt1);
  return (
    <Modal isOpen={true} contentLabel="Minimal Modal Example">
      <button
        onClick={() => {
          dispatch({
            type: actions.CLOSE_MODAL_POPUP,
          });
        }}
      >
        Close Modal
      </button>
      {Object.keys(evnt).map((o) => {
        return (
          <div style={{ background: result1.hasOwnProperty(o) ? "#03d3fc" : "" }}>
            {`Object 1 ${o} : ${evnt[o]}`} {`Object 2 ${o} : ${evnt1[o]}`}
          </div>
        );
      })}
    </Modal>
  );
};
ModalPopup = connect((state, ownProps) => {
  return { selectedEvents: state.selectedEvents, events: state.events };
})(ModalPopup);
//--> App wrapper
let App = ({
  addresses,
  events,
  userIds,
  selectedUserId,
  selectedAddressId,
  comparingEvents,
  error,
  openModalPopup,
}) => {
  return (
    <>
      {error ? <p className="error">{error}</p> : ""}
      {userIds && userIds.length ? (
        <UserSelectForm userIds={userIds} selectedUserId={selectedUserId} />
      ) : (
        ""
      )}
      <div className="addresses">
        <h2>Address Information</h2>
        {addresses && addresses.length ? (
          <ul>
            {addresses.map((address) => {
              return <Address key={address.id} addressJson={address} />;
            })}
          </ul>
        ) : (
          <p>
            {selectedUserId
              ? "No addresses found."
              : "Choose a user ID from the dropdown above."}
          </p>
        )}
      </div>
      <div className="events">
        <h2>Events</h2>
        {events && events.length ? (
          <EventList events={events} />
        ) : (
          <p>
            {selectedAddressId
              ? "No events found."
              : "Select an address to see events"}
          </p>
        )}
      </div>
      {openModalPopup && <ModalPopup />}
    </>
  );
};
App = connect((state) => {
  return {
    addresses: undeletedAddresses(state.addresses),
    ...state,
  };
})(App);

export { App };
