export function GeneralErrorUi(props: { message: string }) {
  return (
    <>
      <h2>Oh No.</h2>
      <h6 className='my-4'>{props.message}</h6>
      <button
        onClick={() => {
          window.location.reload();
        }}
        className='shadow rounded-md bg-indigo-600 px-6 py-4 text-xl font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
      >
        Refresh?
      </button>
    </>
  );
}
