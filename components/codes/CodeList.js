// import MeetupItem from './MeetupItem';
// import
import classes from "./CodeList.module.css";

function CodeList(props) {
  // console.log('props', props);
  return (
    <table id="custom">
      {Object.keys(props.fields).map((key) => {
        console.log("key: ", props.fields[key].label);
        <>
          <tr id={key}>
            <td>{props.fields[key].label}</td>
            <td>{props.fields[key].label}</td>
          </tr>
        </>;
      })}
    </table>
  );
}

export default CodeList;
